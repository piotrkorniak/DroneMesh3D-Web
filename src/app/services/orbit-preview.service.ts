import { computed, inject, Injectable } from '@angular/core';
import { fromLonLat } from 'ol/proj';
import { circular } from 'ol/geom/Polygon';
import { PoiStateService } from './poi-state.service';

@Injectable({ providedIn: 'root' })
export class OrbitPreviewService {
  private readonly poiState = inject(PoiStateService);

  /** Generates preview coordinates (EPSG:4326) for the orbit based on shape, center, radius */
  readonly previewCoordinates = computed<[number, number][] | null>(() => {
    if (!this.poiState.hasCenter()) return null;
    const radius = this.poiState.radiusM();
    if (!radius || radius <= 0) return null;

    const lat = this.poiState.centerLat()!;
    const lon = this.poiState.centerLon()!;
    const shape = this.poiState.orbitShape();

    switch (shape) {
      case 'circular':
        return this.generateCircle(lon, lat, radius);
      case 'rectangular':
      case 'polygon-following':
        // TODO: generate actual rectangular/polygon-offset preview geometry
        // Currently shows circular approximation — UI displays "preview przybliżony" note
        return this.generateCircle(lon, lat, radius);
    }
  });

  /** Generates projected coordinates (EPSG:3857) ready for OpenLayers rendering */
  readonly projectedCoordinates = computed<[number, number][] | null>(() => {
    const coords = this.previewCoordinates();
    if (!coords) return null;
    return coords.map((c) => fromLonLat(c) as [number, number]);
  });

  private generateCircle(lon: number, lat: number, radiusM: number): [number, number][] {
    const geom = circular([lon, lat], radiusM, 64);
    return geom.getCoordinates()[0] as [number, number][];
  }
}
