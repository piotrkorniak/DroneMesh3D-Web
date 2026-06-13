import { computed, Injectable, signal } from '@angular/core';

export type OrbitShape = 'circular' | 'rectangular' | 'polygon-following';

@Injectable({ providedIn: 'root' })
export class PoiStateService {
  readonly centerLat = signal<number | null>(null);
  readonly centerLon = signal<number | null>(null);
  readonly radiusM = signal(50);
  readonly isManualCenter = signal(false);
  readonly orbitShape = signal<OrbitShape>('circular');
  readonly isManualShape = signal(false);
  readonly isPoiModeActive = signal(false);

  readonly hasCenter = computed(() => this.centerLat() !== null && this.centerLon() !== null);
  readonly centerCoords = computed(() => {
    const lat = this.centerLat();
    const lon = this.centerLon();
    return lat !== null && lon !== null ? ([lat, lon] as [number, number]) : null;
  });

  setCenterFromMap(lat: number, lon: number): void {
    this.centerLat.set(Math.round(lat * 1e6) / 1e6);
    this.centerLon.set(Math.round(lon * 1e6) / 1e6);
    this.isManualCenter.set(true);
  }

  setCenterFromCentroid(lat: number, lon: number): void {
    this.centerLat.set(Math.round(lat * 1e6) / 1e6);
    this.centerLon.set(Math.round(lon * 1e6) / 1e6);
  }

  resetForNewArea(): void {
    this.isManualCenter.set(false);
    this.isManualShape.set(false);
    this.centerLat.set(null);
    this.centerLon.set(null);
  }

  setRadius(r: number): void {
    this.radiusM.set(r);
  }

  setOrbitShape(shape: OrbitShape): void {
    this.orbitShape.set(shape);
  }

  overrideShape(shape: OrbitShape): void {
    this.orbitShape.set(shape);
    this.isManualShape.set(true);
  }

  activate(): void {
    this.isPoiModeActive.set(true);
  }

  deactivate(): void {
    this.isPoiModeActive.set(false);
    this.resetForNewArea();
  }
}
