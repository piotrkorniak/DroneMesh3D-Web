import { TestBed } from '@angular/core/testing';
import { PoiValidationService } from './poi-validation.service';
import { PoiStateService } from './poi-state.service';
import { SelectionStateService } from './selection-state.service';

describe('PoiValidationService', () => {
  let service: PoiValidationService;
  let poiState: PoiStateService;
  let selectionState: SelectionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoiValidationService);
    poiState = TestBed.inject(PoiStateService);
    selectionState = TestBed.inject(SelectionStateService);
  });

  it('warns when radius < 5m', () => {
    poiState.setRadius(3);
    expect(service.warnings()).toContain('Promień może być za mały dla bezpiecznego lotu');
  });

  it('no warning when radius >= 5m and no area', () => {
    poiState.setRadius(50);
    expect(service.warnings().length).toBe(0);
  });

  it('warns when center is far from polygon', () => {
    // Area at ~52N, 20E
    selectionState.areas.set([
      {
        id: '1',
        createdAt: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [20.0, 52.0],
              [20.01, 52.0],
              [20.01, 52.01],
              [20.0, 52.01],
              [20.0, 52.0],
            ],
          ],
        },
        name: null,
        sequentialNumber: 1,
      },
    ]);
    selectionState.selectArea('1');

    // Set center very far away
    poiState.setCenterFromMap(53.0, 21.0);
    poiState.setRadius(50);

    expect(service.warnings()).toContain('Centrum POI jest daleko od obszaru');
  });

  it('warns when radius is too large relative to area', () => {
    selectionState.areas.set([
      {
        id: '1',
        createdAt: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [20.0, 52.0],
              [20.001, 52.0],
              [20.001, 52.001],
              [20.0, 52.001],
              [20.0, 52.0],
            ],
          ],
        },
        name: null,
        sequentialNumber: 1,
      },
    ]);
    selectionState.selectArea('1');

    poiState.setCenterFromMap(52.0005, 20.0005);
    poiState.setRadius(5000); // very large

    expect(service.warnings()).toContain('Promień może być za duży');
  });

  it('skips distance checks when no area selected', () => {
    poiState.setCenterFromMap(53.0, 21.0);
    poiState.setRadius(50);
    // No area selected — should only check radius
    expect(service.warnings().length).toBe(0);
  });
});
