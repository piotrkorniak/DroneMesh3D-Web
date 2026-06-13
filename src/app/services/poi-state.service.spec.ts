import { TestBed } from '@angular/core/testing';
import { PoiStateService } from './poi-state.service';

describe('PoiStateService', () => {
  let service: PoiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoiStateService);
  });

  it('setCenterFromMap sets isManualCenter to true', () => {
    service.setCenterFromMap(52.123456, 20.654321);
    expect(service.isManualCenter()).toBe(true);
    expect(service.centerLat()).toBe(52.123456);
    expect(service.centerLon()).toBe(20.654321);
  });

  it('setCenterFromCentroid does not set isManualCenter', () => {
    service.setCenterFromCentroid(52.1, 20.5);
    expect(service.isManualCenter()).toBe(false);
    expect(service.hasCenter()).toBe(true);
  });

  it('resetForNewArea clears manual flags and center', () => {
    service.setCenterFromMap(52.1, 20.5);
    service.overrideShape('rectangular');
    service.resetForNewArea();
    expect(service.isManualCenter()).toBe(false);
    expect(service.isManualShape()).toBe(false);
    expect(service.centerLat()).toBeNull();
    expect(service.centerLon()).toBeNull();
  });

  it('setRadius updates radiusM', () => {
    service.setRadius(100);
    expect(service.radiusM()).toBe(100);
  });

  it('overrideShape sets isManualShape to true', () => {
    service.overrideShape('polygon-following');
    expect(service.orbitShape()).toBe('polygon-following');
    expect(service.isManualShape()).toBe(true);
  });

  it('hasCenter is false when no center set', () => {
    expect(service.hasCenter()).toBe(false);
  });

  it('rounds coordinates to 6 decimal places', () => {
    service.setCenterFromMap(52.12345678, 20.98765432);
    expect(service.centerLat()).toBe(52.123457);
    expect(service.centerLon()).toBe(20.987654);
  });
});
