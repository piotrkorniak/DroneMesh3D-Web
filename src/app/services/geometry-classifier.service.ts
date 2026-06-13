import { Injectable } from '@angular/core';

export type GeometryShape = 'circular' | 'rectangular' | 'irregular';

export interface ClassificationResult {
  shape: GeometryShape;
  centroid: [number, number];
}

@Injectable({ providedIn: 'root' })
export class GeometryClassifierService {
  classify(coordinates: number[][]): ClassificationResult {
    // Remove closing vertex if duplicated
    const verts = coordinates.length > 1 && coordinates[0][0] === coordinates[coordinates.length - 1][0] && coordinates[0][1] === coordinates[coordinates.length - 1][1] ? coordinates.slice(0, -1) : coordinates;

    const centroid = this.computeCentroid(verts);

    if (verts.length < 3) {
      return { shape: 'circular', centroid };
    }

    if (this.isCircular(verts)) {
      return { shape: 'circular', centroid };
    }

    if (this.isRectangular(verts)) {
      return { shape: 'rectangular', centroid };
    }

    return { shape: 'irregular', centroid };
  }

  private computeCentroid(verts: number[][]): [number, number] {
    const n = verts.length;
    if (n === 0) return [0, 0];
    const sumLon = verts.reduce((s, v) => s + v[0], 0);
    const sumLat = verts.reduce((s, v) => s + v[1], 0);
    return [sumLon / n, sumLat / n];
  }

  private isCircular(verts: number[][]): boolean {
    // Check bounding box aspect ratio 0.9–1.1
    const lons = verts.map((v) => v[0]);
    const lats = verts.map((v) => v[1]);
    const width = Math.max(...lons) - Math.min(...lons);
    const height = Math.max(...lats) - Math.min(...lats);
    if (width === 0 || height === 0) return false;
    const ratio = width / height;
    if (ratio < 0.9 || ratio > 1.1) return false;

    // Check all vertices within 10% of bounding circle radius
    const cx = (Math.max(...lons) + Math.min(...lons)) / 2;
    const cy = (Math.max(...lats) + Math.min(...lats)) / 2;
    const boundingRadius = Math.max(width, height) / 2;
    const tolerance = boundingRadius * 0.1;

    return verts.every((v) => {
      const dist = Math.sqrt((v[0] - cx) ** 2 + (v[1] - cy) ** 2);
      return Math.abs(dist - boundingRadius) <= tolerance;
    });
  }

  private isRectangular(verts: number[][]): boolean {
    // Compute edges and their lengths
    const edges: { dx: number; dy: number; len: number }[] = [];
    for (let i = 0; i < verts.length; i++) {
      const next = verts[(i + 1) % verts.length];
      const dx = next[0] - verts[i][0];
      const dy = next[1] - verts[i][1];
      edges.push({ dx, dy, len: Math.sqrt(dx * dx + dy * dy) });
    }

    const totalPerimeter = edges.reduce((s, e) => s + e.len, 0);
    if (totalPerimeter === 0) return false;

    // Sort edges by length descending, take top 4
    const sorted = [...edges].sort((a, b) => b.len - a.len);
    const top4 = sorted.slice(0, 4);
    const top4Perimeter = top4.reduce((s, e) => s + e.len, 0);

    // 4 dominant edges must be ≥80% of total perimeter
    if (top4Perimeter / totalPerimeter < 0.8) return false;

    // Check angles between adjacent dominant edges are ~90°
    const dominantIndices = top4.map((e) => edges.indexOf(e)).sort((a, b) => a - b);
    for (let i = 0; i < dominantIndices.length; i++) {
      const idx1 = dominantIndices[i];
      const idx2 = dominantIndices[(i + 1) % dominantIndices.length];
      // Only check if they're actually adjacent
      if (idx2 === (idx1 + 1) % edges.length || idx1 === (idx2 + 1) % edges.length) {
        const e1 = edges[idx1];
        const e2 = edges[idx2];
        const dot = e1.dx * e2.dx + e1.dy * e2.dy;
        const cosAngle = dot / (e1.len * e2.len);
        const angle = Math.abs(Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI));
        if (Math.abs(angle - 90) > 10) return false;
      }
    }

    return true;
  }
}
