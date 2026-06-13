import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { SelectionStateService } from '../../services/selection-state.service';
import { FlightPlansApiService } from '../../api/services/flight-plans.service';
import { ToastService } from '../../services/toast.service';
import { PoiStateService, OrbitShape } from '../../services/poi-state.service';
import { PoiValidationService } from '../../services/poi-validation.service';
import { GeometryClassifierService } from '../../services/geometry-classifier.service';
import { rangeValidator } from '../../utils/range-validator';
import { FlightMode } from '../../api/models/flight-mode';
import { CalculateFlightPathRequest } from '../../api/models/calculate-flight-path-request';

/** Field metadata for labels, tooltips, and validation ranges. */
interface FieldMeta {
  id: string;
  label: string;
  tooltip: string;
  min: number;
  max: number;
  step?: number;
  required: boolean;
  defaultValue: number | null;
  useSlider?: boolean;
  useCompass?: boolean;
}

interface CameraPreset {
  label: string;
  sensorWidthMm: number | null;
  focalLengthMm: number | null;
  imageWidthPx: number | null;
  imageHeightPx: number | null;
}

const CAMERA_PRESETS: CameraPreset[] = [
  { label: 'DJI Mini 5 Pro', sensorWidthMm: 9.7, focalLengthMm: 6.7, imageWidthPx: 4032, imageHeightPx: 3024 },
  { label: 'DJI Mini 4 Pro', sensorWidthMm: 9.7, focalLengthMm: 6.7, imageWidthPx: 4032, imageHeightPx: 3024 },
  { label: 'DJI Mavic 3', sensorWidthMm: 17.3, focalLengthMm: 12.3, imageWidthPx: 5280, imageHeightPx: 3956 },
  { label: 'DJI Air 3', sensorWidthMm: 9.7, focalLengthMm: 6.7, imageWidthPx: 4032, imageHeightPx: 3024 },
  { label: 'DJI Phantom 4 Pro', sensorWidthMm: 13.2, focalLengthMm: 8.8, imageWidthPx: 5472, imageHeightPx: 3648 },
  { label: 'Autel EVO II Pro', sensorWidthMm: 13.2, focalLengthMm: 8.6, imageWidthPx: 5472, imageHeightPx: 3648 },
  { label: 'Własne ustawienia', sensorWidthMm: null, focalLengthMm: null, imageWidthPx: null, imageHeightPx: null },
];

const CAMERA_FIELD_IDS = ['sensorWidthMm', 'focalLengthMm', 'imageWidthPx', 'imageHeightPx'];

const GRID_FIELDS: FieldMeta[] = [
  {
    id: 'altitudeM',
    label: 'Wysokość lotu (m)',
    tooltip: 'Na jakiej wysokości poleci dron (w metrach). Niżej = lepsze zdjęcia, wyżej = szybszy lot.',
    min: 1,
    max: 120,
    step: 1,
    required: true,
    defaultValue: 80,
    useSlider: true,
  },
  {
    id: 'sensorWidthMm',
    label: 'Szerokość sensora (mm)',
    tooltip: 'Fizyczna szerokość sensora kamery w milimetrach',
    min: 1,
    max: 100,
    required: true,
    defaultValue: 9.7,
  },
  { id: 'focalLengthMm', label: 'Ogniskowa (mm)', tooltip: 'Ogniskowa obiektywu kamery w milimetrach', min: 1, max: 500, required: true, defaultValue: 6.7 },
  {
    id: 'imageWidthPx',
    label: 'Szerokość zdjęcia (px)',
    tooltip: 'Rozdzielczość pozioma zdjęcia w pikselach',
    min: 1,
    max: 20000,
    required: true,
    defaultValue: 4032,
  },
  {
    id: 'imageHeightPx',
    label: 'Wysokość zdjęcia (px)',
    tooltip: 'Rozdzielczość pionowa zdjęcia w pikselach',
    min: 1,
    max: 20000,
    required: true,
    defaultValue: 3024,
  },
  {
    id: 'frontOverlapPercent',
    label: 'Nakładka frontalna (%)',
    tooltip: 'Jak bardzo zdjęcia nachodzą na siebie w kierunku lotu (75–80%). Więcej = lepsza jakość modelu 3D.',
    min: 75,
    max: 80,
    step: 1,
    required: true,
    defaultValue: 78,
    useSlider: true,
  },
  {
    id: 'sideOverlapPercent',
    label: 'Nakładka boczna (%)',
    tooltip: 'Jak bardzo zdjęcia nachodzą na siebie między pasami (65–75%). Więcej = mniej luk w danych.',
    min: 65,
    max: 75,
    step: 1,
    required: true,
    defaultValue: 70,
    useSlider: true,
  },
  {
    id: 'headingDegrees',
    label: 'Kierunek lotu',
    tooltip: 'Kierunek w jakim poleci dron. Wybierz stronę świata lub zostaw "Auto" dla optymalnego.',
    min: 0,
    max: 359,
    step: 1,
    required: false,
    defaultValue: null,
    useSlider: false,
    useCompass: true,
  },
];

const POI_FIELDS: FieldMeta[] = [
  {
    id: 'centerLatitude',
    label: 'Szerokość geogr. środka',
    tooltip: 'Szerokość geograficzna punktu centralnego (–90 do 90)',
    min: -90,
    max: 90,
    required: true,
    defaultValue: null,
  },
  {
    id: 'centerLongitude',
    label: 'Długość geogr. środka',
    tooltip: 'Długość geograficzna punktu centralnego (–180 do 180)',
    min: -180,
    max: 180,
    required: true,
    defaultValue: null,
  },
  {
    id: 'radiusM',
    label: 'Promień (m)',
    tooltip: 'Promień okręgu lotu wokół punktu w metrach',
    min: 1,
    max: 500,
    step: 1,
    required: true,
    defaultValue: 50,
    useSlider: true,
  },
  {
    id: 'altitudeM',
    label: 'Wysokość lotu (m)',
    tooltip: 'Wysokość lotu drona w metrach (1–120)',
    min: 1,
    max: 120,
    step: 1,
    required: true,
    defaultValue: 80,
    useSlider: true,
  },
  {
    id: 'gimbalPitchDegrees',
    label: 'Pochylenie kamery (°)',
    tooltip: 'Kąt kamery (–90 = prosto w dół, –45 = pod kątem 45°)',
    min: -90,
    max: -45,
    step: 1,
    required: true,
    defaultValue: -45,
    useSlider: true,
  },
  {
    id: 'photoCount',
    label: 'Liczba zdjęć',
    tooltip: 'Ile zdjęć dron ma zrobić na okręgu. Zostaw puste dla automatycznego.',
    min: 1,
    max: 1000,
    required: false,
    defaultValue: null,
  },
  {
    id: 'overlapPercent',
    label: 'Nakładka (%)',
    tooltip: 'Jak bardzo zdjęcia się pokrywają. Opcjonalne.',
    min: 20,
    max: 95,
    required: false,
    defaultValue: null,
  },
  {
    id: 'cameraHorizontalFovDegrees',
    label: 'FOV kamery (°)',
    tooltip: 'Poziome pole widzenia kamery w stopniach. Opcjonalne.',
    min: 1,
    max: 180,
    required: false,
    defaultValue: null,
  },
  {
    id: 'structureHeightM',
    label: 'Wysokość obiektu (m)',
    tooltip: 'Wysokość fotografowanego budynku/obiektu w metrach. Opcjonalne.',
    min: 1,
    max: 1000,
    required: false,
    defaultValue: null,
  },
];

const POI_PRIMARY_FIELD_IDS = ['radiusM', 'altitudeM', 'photoCount'];
const POI_ADVANCED_FIELD_IDS = ['overlapPercent', 'cameraHorizontalFovDegrees', 'structureHeightM', 'gimbalPitchDegrees'];

@Component({
  selector: 'app-flight-plan-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './flight-plan-form.component.html',
  styleUrl: './flight-plan-form.component.scss',
})
export class FlightPlanFormComponent {
  private readonly selectionState = inject(SelectionStateService);
  private readonly flightPlansApi = inject(FlightPlansApiService);
  private readonly toastService = inject(ToastService);
  readonly poiState = inject(PoiStateService);
  readonly poiValidation = inject(PoiValidationService);
  private readonly geometryClassifier = inject(GeometryClassifierService);

  /** Current flight mode */
  readonly mode = signal<FlightMode>('Grid');

  /** Whether a calculation request is in progress */
  readonly submitting = signal(false);

  /** Whether an area is selected (form enabled state) */
  readonly hasSelectedArea = computed(() => this.selectionState.selectedAreaId() !== null);

  /** Fields metadata for the current mode */
  readonly activeFields = computed(() => (this.mode() === 'Grid' ? GRID_FIELDS : POI_FIELDS));

  /** POI primary fields (always visible) */
  readonly poiPrimaryFields = computed(() => POI_FIELDS.filter((f) => POI_PRIMARY_FIELD_IDS.includes(f.id)));

  /** POI advanced fields (collapsible) */
  readonly poiAdvancedFields = computed(() => POI_FIELDS.filter((f) => POI_ADVANCED_FIELD_IDS.includes(f.id)));

  /** Camera presets list */
  readonly cameraPresets = CAMERA_PRESETS;

  /** Currently selected camera preset index (default: DJI Mini 5 Pro = index 0) */
  readonly selectedPresetIndex = signal(0);

  /** Whether camera fields are read-only (true for all presets except "Własne ustawienia") */
  readonly cameraFieldsReadonly = computed(() => {
    const preset = CAMERA_PRESETS[this.selectedPresetIndex()];
    return preset.sensorWidthMm !== null; // "Własne ustawienia" has null values
  });

  /** Compass heading directions */
  readonly compassDirections = [
    { label: 'N', value: 0 },
    { label: 'NE', value: 45 },
    { label: 'E', value: 90 },
    { label: 'SE', value: 135 },
    { label: 'S', value: 180 },
    { label: 'SW', value: 225 },
    { label: 'W', value: 270 },
    { label: 'NW', value: 315 },
  ];

  /** Reactive form for Grid mode */
  readonly gridForm = this.buildGridForm();

  /** Reactive form for Poi mode */
  readonly poiForm = this.buildPoiForm();

  /** Currently active form group (based on mode) */
  readonly activeForm = computed(() => (this.mode() === 'Grid' ? this.gridForm : this.poiForm));

  /** Track which fields have been touched (for showing errors on blur) */
  private readonly touchedFields = signal<Set<string>>(new Set());

  /** Whether advanced POI params are expanded */
  readonly advancedExpanded = signal(false);

  /** Detected orbit shape label */
  readonly orbitShapeLabel = computed(() => {
    const shape = this.poiState.orbitShape();
    switch (shape) {
      case 'circular':
        return 'Orbita: kołowa';
      case 'rectangular':
        return 'Orbita: prostokątna';
      case 'polygon-following':
        return 'Orbita: dopasowana do konturu';
    }
  });

  constructor() {
    // Programmatically enable/disable forms based on area selection
    effect(() => {
      const enabled = this.hasSelectedArea();
      const opts = { emitEvent: false };
      if (enabled) {
        this.gridForm.enable(opts);
        this.poiForm.enable(opts);
      } else {
        this.gridForm.disable(opts);
        this.poiForm.disable(opts);
      }
    });

    // Sync POI mode active state
    effect(() => {
      if (this.mode() === 'Poi' && this.hasSelectedArea()) {
        this.poiState.activate();
      } else {
        this.poiState.deactivate();
      }
    });

    // Auto-center from centroid when entering POI mode
    effect(() => {
      if (this.mode() !== 'Poi') return;
      if (this.poiState.isManualCenter()) return;
      const area = this.selectionState.selectedArea();
      if (!area?.geometry?.coordinates?.[0]) return;
      const coords = area.geometry.coordinates[0];
      const result = this.geometryClassifier.classify(coords);
      this.poiState.setCenterFromCentroid(result.centroid[1], result.centroid[0]);
      if (!this.poiState.isManualShape()) {
        const shape = result.shape === 'irregular' ? 'polygon-following' : result.shape;
        this.poiState.setOrbitShape(shape as OrbitShape);
      }
    });

    // Sync radius from form to PoiStateService
    this.poiForm
      .get('radiusM')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((val) => {
        if (this.mode() === 'Poi' && val && Number(val) > 0) {
          this.poiState.setRadius(Number(val));
        }
      });

    // Sync center from PoiStateService to form
    effect(() => {
      const lat = this.poiState.centerLat();
      const lon = this.poiState.centerLon();
      if (lat !== null && lon !== null) {
        this.poiForm.patchValue({ centerLatitude: lat, centerLongitude: lon }, { emitEvent: false });
      }
    });

    // Task 6.2: Mutual exclusion — photoCount vs overlap/FOV
    this.poiForm
      .get('photoCount')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((val) => {
        const overlap = this.poiForm.get('overlapPercent');
        const fov = this.poiForm.get('cameraHorizontalFovDegrees');
        if (val && Number(val) >= 1 && Number(val) <= 1000) {
          overlap?.disable({ emitEvent: false });
          fov?.disable({ emitEvent: false });
        } else {
          overlap?.enable({ emitEvent: false });
          fov?.enable({ emitEvent: false });
        }
      });

    // Task 6.3: Auto gimbalPitch from structureHeight
    this.poiForm
      .get('structureHeightM')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((val) => {
        const gimbal = this.poiForm.get('gimbalPitchDegrees');
        if (val && Number(val) > 0) {
          const alt = Number(this.poiForm.get('altitudeM')?.value || 80);
          const radius = Number(this.poiForm.get('radiusM')?.value || 50);
          const pitch = -Math.atan2(alt - Number(val), radius) * (180 / Math.PI);
          const clamped = Math.max(-90, Math.min(-45, pitch));
          gimbal?.setValue(Math.round(clamped), { emitEvent: false });
          gimbal?.disable({ emitEvent: false });
        } else {
          gimbal?.enable({ emitEvent: false });
        }
      });
  }

  /** Check if a field is a camera field */
  isCameraField(fieldId: string): boolean {
    return CAMERA_FIELD_IDS.includes(fieldId);
  }

  /** Set heading to a compass direction or null (auto) */
  setHeading(value: number | null): void {
    this.gridForm.get('headingDegrees')?.setValue(value);
  }

  /** Get current heading value */
  getHeadingValue(): number | null {
    return this.gridForm.get('headingDegrees')?.value ?? null;
  }

  onPresetChange(event: Event): void {
    const index = Number((event.target as HTMLSelectElement).value);
    this.selectedPresetIndex.set(index);

    const preset = CAMERA_PRESETS[index];
    if (preset.sensorWidthMm !== null) {
      // Apply preset values to form
      this.gridForm.patchValue({
        sensorWidthMm: preset.sensorWidthMm,
        focalLengthMm: preset.focalLengthMm,
        imageWidthPx: preset.imageWidthPx,
        imageHeightPx: preset.imageHeightPx,
      });
    }
  }

  setMode(newMode: FlightMode): void {
    this.mode.set(newMode);
    this.touchedFields.set(new Set());
    this.advancedExpanded.set(false);
  }

  toggleAdvanced(): void {
    this.advancedExpanded.update((v) => !v);
  }

  markFieldTouched(fieldId: string): void {
    this.touchedFields.update((set) => {
      const newSet = new Set(set);
      newSet.add(fieldId);
      return newSet;
    });
    // Also mark the form control as touched for Angular's validation display
    const control = this.activeForm().get(fieldId);
    control?.markAsTouched();
    control?.updateValueAndValidity();
  }

  isFieldInvalid(fieldId: string): boolean {
    const control = this.activeForm().get(fieldId);
    if (!control) return false;
    return control.invalid && (control.touched || this.touchedFields().has(fieldId));
  }

  getFieldError(fieldId: string): string {
    const control = this.activeForm().get(fieldId);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Pole wymagane';
    }
    if (control.errors['range']) {
      return control.errors['range'].message;
    }
    return 'Nieprawidłowa wartość';
  }

  getAriaDescribedBy(fieldId: string): string {
    const parts: string[] = [`fpf-tooltip-${fieldId}`];
    if (this.isFieldInvalid(fieldId)) {
      parts.push(`fpf-error-${fieldId}`);
    }
    return parts.join(' ');
  }

  onSubmit(): void {
    if (!this.hasSelectedArea() || this.submitting()) return;

    const form = this.activeForm();
    form.markAllAsTouched();
    // Mark all fields touched for our custom tracking
    const allFieldIds = this.activeFields().map((f) => f.id);
    this.touchedFields.set(new Set(allFieldIds));

    if (form.invalid) {
      this.scrollToFirstInvalidField();
      return;
    }

    this.submitCalculation();
  }

  private scrollToFirstInvalidField(): void {
    const form = this.activeForm();
    const fields = this.activeFields();

    for (const field of fields) {
      const control = form.get(field.id);
      if (control?.invalid) {
        const element = document.getElementById('fpf-' + field.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
        break;
      }
    }
  }

  private submitCalculation(): void {
    this.submitting.set(true);

    const areaId = this.selectionState.selectedAreaId()!;
    const currentMode = this.mode();
    const request = this.buildRequest(areaId, currentMode);

    this.flightPlansApi.calculate(request).subscribe({
      next: (plan) => {
        this.submitting.set(false);
        this.toastService.show('success', 'Plan lotu wygenerowany');
        // Prepend the new plan to the SelectionStateService plans list
        this.selectionState.plans.update((plans) => [plan, ...plans]);
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message || err?.message || 'Wystąpił błąd podczas generowania planu lotu';
        this.toastService.show('error', message);
      },
    });
  }

  private buildRequest(areaId: string, currentMode: FlightMode): CalculateFlightPathRequest {
    if (currentMode === 'Grid') {
      const v = this.gridForm.value;
      return {
        areaId,
        mode: 'Grid',
        grid: {
          altitudeM: Number(v.altitudeM),
          camera: {
            sensorWidthMm: Number(v.sensorWidthMm),
            focalLengthMm: Number(v.focalLengthMm),
            imageWidthPx: Number(v.imageWidthPx),
            imageHeightPx: Number(v.imageHeightPx),
          },
          frontOverlapPercent: Number(v.frontOverlapPercent),
          sideOverlapPercent: Number(v.sideOverlapPercent),
          headingDegrees: v.headingDegrees != null && v.headingDegrees !== '' ? Number(v.headingDegrees) : null,
        },
        poi: null,
      };
    } else {
      const v = this.poiForm.value;
      return {
        areaId,
        mode: 'Poi',
        grid: null,
        poi: {
          centerLatitude: Number(v.centerLatitude),
          centerLongitude: Number(v.centerLongitude),
          radiusM: Number(v.radiusM),
          altitudeM: Number(v.altitudeM),
          gimbalPitchDegrees: Number(v.gimbalPitchDegrees),
          photoCount: v.photoCount != null && v.photoCount !== '' ? Number(v.photoCount) : null,
          overlapPercent: v.overlapPercent != null && v.overlapPercent !== '' ? Number(v.overlapPercent) : null,
          cameraHorizontalFovDegrees: v.cameraHorizontalFovDegrees != null && v.cameraHorizontalFovDegrees !== '' ? Number(v.cameraHorizontalFovDegrees) : null,
          structureHeightM: v.structureHeightM != null && v.structureHeightM !== '' ? Number(v.structureHeightM) : null,
        },
      };
    }
  }

  private buildGridForm(): FormGroup {
    return new FormGroup({
      altitudeM: new FormControl(80, [Validators.required, rangeValidator(1, 120)]),
      sensorWidthMm: new FormControl(9.7, [Validators.required, rangeValidator(1, 100)]),
      focalLengthMm: new FormControl(6.7, [Validators.required, rangeValidator(1, 500)]),
      imageWidthPx: new FormControl(4032, [Validators.required, rangeValidator(1, 20000)]),
      imageHeightPx: new FormControl(3024, [Validators.required, rangeValidator(1, 20000)]),
      frontOverlapPercent: new FormControl(78, [Validators.required, rangeValidator(75, 80)]),
      sideOverlapPercent: new FormControl(70, [Validators.required, rangeValidator(65, 75)]),
      headingDegrees: new FormControl(null, [rangeValidator(0, 359)]),
    });
  }

  private buildPoiForm(): FormGroup {
    return new FormGroup({
      centerLatitude: new FormControl(null, [Validators.required, rangeValidator(-90, 90)]),
      centerLongitude: new FormControl(null, [Validators.required, rangeValidator(-180, 180)]),
      radiusM: new FormControl(50, [Validators.required, rangeValidator(1, 500)]),
      altitudeM: new FormControl(80, [Validators.required, rangeValidator(1, 120)]),
      gimbalPitchDegrees: new FormControl(-45, [Validators.required, rangeValidator(-90, -45)]),
      photoCount: new FormControl(null, [rangeValidator(1, 1000)]),
      overlapPercent: new FormControl(null, [rangeValidator(20, 95)]),
      cameraHorizontalFovDegrees: new FormControl(null, [rangeValidator(1, 180)]),
      structureHeightM: new FormControl(null, [rangeValidator(1, 1000)]),
    });
  }
}
