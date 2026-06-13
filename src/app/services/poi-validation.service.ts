import { computed, inject, Injectable } from '@angular/core';
import { PoiStateService } from './poi-state.service';
import { SelectionStateService } from './selection-state.service';

@Injectable({ providedIn: 'root' })
export class PoiValidationService {
  private readonly poiState = inject(PoiStateService);
  private readonly selectionState = inject(SelectionStateService);

  readonly warnings = computed<string[]>(() => {
    const warnings: string[] = [];
    const radius = this.poiState.radiusM();

    if (radius < 5) {
      warnings.push('Promień może być za mały dla bezpiecznego lotu');
    }

    const area = this.selectionState.selectedArea();
    if (!area?.geometry?.coordinates?.[0]) return warnings;

    const coords = area.geometry.coordinates[0] as [number, number][];
    if (coords.length < 3) return warnings;

    const lat = this.poiState.centerLat();
    const lon = this.poiState.centerLon();

    if (lat !== null && lon !== null) {
      const minDist = this.minDistanceToPolygon(lon, lat, coords);
      if (minDist > 500) {
        warnings.push('Centrum POI jest daleko od obszaru');
      }
    }

    const longestEdge = this.longestMbrEdge(coords);
    if (radius > 2 * longestEdge) {
      warnings.push('Promień może być za duży');
    }

    return warnings;
  });

  private minDistanceToPolygon(lon: number, lat: number, coords: [number, number][]): number {
    let minDist = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const dist = this.pointToSegmentDistance(lon, lat, coords[i], coords[i + 1]);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  private pointToSegmentDistance(px: number, py: number, a: [number, number], b: [number, number]): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - a[0]) * dx + (py - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const closestLon = a[0] + t * dx;
    const closestLat = a[1] + t * dy;
    return this.haversineDistance(py, px, closestLat, closestLon);
  }

  private longestMbrEdge(coords: [number, number][]): number {
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const width = this.haversineDistance(Math.min(...lats), Math.min(...lons), Math.min(...lats), Math.max(...lons));
    const height = this.haversineDistance(Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.min(...lons));
    return Math.max(width, height);
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
