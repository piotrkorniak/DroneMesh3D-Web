import { TestBed } from '@angular/core/testing';
import { GeometryClassifierService } from './geometry-classifier.service';

describe('GeometryClassifierService', () => {
  let service: GeometryClassifierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeometryClassifierService);
  });

  it('classifies a circle approximation as circular', () => {
    // 20-point circle at equator (lat=0) to avoid cos(lat) distortion
    const coords: number[][] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * 2 * Math.PI;
      coords.push([20 + 0.01 * Math.cos(angle), 0 + 0.01 * Math.sin(angle)]);
    }
    coords.push(coords[0]); // close ring

    const result = service.classify(coords);
    expect(result.shape).toBe('circular');
  });

  it('classifies a rectangle as rectangular', () => {
    const coords = [
      [20.0, 52.0],
      [20.01, 52.0],
      [20.01, 52.005],
      [20.0, 52.005],
      [20.0, 52.0], // close
    ];

    const result = service.classify(coords);
    expect(result.shape).toBe('rectangular');
  });

  it('classifies an L-shape as irregular', () => {
    const coords = [
      [0, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 2],
      [0, 2],
      [0, 0],
    ];

    const result = service.classify(coords);
    expect(result.shape).toBe('irregular');
  });

  it('defaults to circular for fewer than 3 vertices', () => {
    const coords = [
      [20, 52],
      [21, 53],
    ];

    const result = service.classify(coords);
    expect(result.shape).toBe('circular');
  });

  it('computes centroid as average of vertices', () => {
    const coords = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ];

    const result = service.classify(coords);
    expect(result.centroid[0]).toBeCloseTo(2, 5);
    expect(result.centroid[1]).toBeCloseTo(2, 5);
  });
});
