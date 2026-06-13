import { effect, inject, Injectable } from '@angular/core';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import Text from 'ol/style/Text';
import { fromLonLat } from 'ol/proj';

import { WaypointDto } from '../api/models/waypoint-dto';
import { SelectionStateService } from './selection-state.service';

/** Primary color from design system tokens */
const PRIMARY_COLOR = '#3B82F6';
/** Primary color at 80% opacity for flight path line */
const PRIMARY_COLOR_80 = 'rgba(59, 130, 246, 0.8)';

@Injectable({ providedIn: 'root' })
export class FlightPathVisualizationService {
  private readonly selectionState = inject(SelectionStateService);

  /** Dedicated VectorSource for flight path features */
  readonly flightPathSource = new VectorSource();

  /** Dedicated VectorLayer for flight path visualization (separate from polygon drawing layer) */
  readonly flightPathLayer = new VectorLayer({
    source: this.flightPathSource,
    zIndex: 10,
  });

  /** Map view reference — set externally by MapComponent */
  private mapView: import('ol/View').default | null = null;

  constructor() {
    // React to selectedPlan changes: render/clear/fit
    effect(() => {
      const plan = this.selectionState.selectedPlan();
      if (plan && plan.waypoints && plan.waypoints.length > 0) {
        this.clearFlightPath();
        if (plan.mode === 'Poi') {
          this.renderPoiFlightPath(plan.waypoints);
        } else {
          this.renderFlightPath(plan.waypoints);
        }
        this.fitToFlightPath();
      } else if (plan && plan.mode === 'Poi') {
        // POI plan with no waypoints: show only center marker
        this.clearFlightPath();
        this.renderPoiCenterOnly(plan);
      } else {
        this.clearFlightPath();
      }
    });
  }

  /**
   * Sets the map view reference for fitToFlightPath operations.
   * Should be called by MapComponent after map initialization.
   */
  setMapView(view: import('ol/View').default): void {
    this.mapView = view;
  }

  /**
   * Renders flight path waypoints and connecting line on the map.
   * Transforms coordinates from EPSG:4326 to EPSG:3857 (map projection).
   * Creates numbered point features (12px circle, primary color, 1-based label)
   * and a LineString feature (2px stroke, primary at 80% opacity).
   */
  renderFlightPath(waypoints: WaypointDto[]): void {
    if (!waypoints || waypoints.length === 0) return;

    const projectedCoordinates: [number, number][] = waypoints.map((wp) => fromLonLat([wp.longitude, wp.latitude]) as [number, number]);

    // Create numbered point features for each waypoint
    projectedCoordinates.forEach((coord, index) => {
      const pointFeature = new Feature({
        geometry: new Point(coord),
        waypointIndex: index + 1,
      });

      pointFeature.setStyle(this.createWaypointStyle(index + 1));
      this.flightPathSource.addFeature(pointFeature);
    });

    // Create LineString feature connecting all waypoints
    const lineFeature = new Feature({
      geometry: new LineString(projectedCoordinates),
    });

    lineFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: PRIMARY_COLOR_80,
          width: 2,
        }),
      }),
    );

    this.flightPathSource.addFeature(lineFeature);
  }

  /**
   * Removes all features from the flight path source.
   */
  clearFlightPath(): void {
    this.flightPathSource.clear();
  }

  /**
   * Animates the map view to fit the flight path extent with 15% padding within 500ms.
   */
  fitToFlightPath(): void {
    if (!this.mapView) return;

    const extent = this.flightPathSource.getExtent();
    if (!extent || extent.every((v) => v === Infinity || v === -Infinity)) return;

    this.mapView.fit(extent, {
      padding: [50, 50, 50, 50], // approximate 15% padding
      duration: 500,
    });
  }

  /**
   * Creates the style for a waypoint marker: 12px circle with primary fill and 1-based label.
   */
  private createWaypointStyle(index: number): Style {
    return new Style({
      image: new CircleStyle({
        radius: 6, // 12px diameter = 6px radius
        fill: new Fill({ color: PRIMARY_COLOR }),
        stroke: new Stroke({ color: '#ffffff', width: 1 }),
      }),
      text: new Text({
        text: String(index),
        font: 'bold 10px Inter, sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        textAlign: 'center',
        textBaseline: 'middle',
        offsetY: 0,
      }),
    });
  }

  /**
   * Renders a POI flight path with orbit circle, center marker, direction lines, and numbered waypoints.
   */
  private renderPoiFlightPath(waypoints: WaypointDto[]): void {
    if (!waypoints || waypoints.length === 0) return;

    const projectedCoordinates: [number, number][] = waypoints.map((wp) => fromLonLat([wp.longitude, wp.latitude]) as [number, number]);

    // Compute center as average of all waypoints
    const centerLon = waypoints.reduce((s, wp) => s + wp.longitude, 0) / waypoints.length;
    const centerLat = waypoints.reduce((s, wp) => s + wp.latitude, 0) / waypoints.length;
    const centerProjected = fromLonLat([centerLon, centerLat]) as [number, number];

    // Orbit circle (solid line connecting waypoints in a closed loop)
    const orbitCoords = [...projectedCoordinates, projectedCoordinates[0]];
    const orbitFeature = new Feature({ geometry: new Polygon([orbitCoords]) });
    orbitFeature.setStyle(
      new Style({
        stroke: new Stroke({ color: PRIMARY_COLOR_80, width: 2.5 }),
        fill: new Fill({ color: 'rgba(59, 130, 246, 0.03)' }),
      }),
    );
    this.flightPathSource.addFeature(orbitFeature);

    // Center marker
    const centerFeature = new Feature({ geometry: new Point(centerProjected) });
    centerFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#EF4444' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }),
    );
    this.flightPathSource.addFeature(centerFeature);

    // Direction lines from each waypoint to center
    projectedCoordinates.forEach((coord) => {
      const lineFeature = new Feature({ geometry: new LineString([coord, centerProjected]) });
      lineFeature.setStyle(
        new Style({
          stroke: new Stroke({ color: 'rgba(239, 68, 68, 0.3)', width: 1 }),
        }),
      );
      this.flightPathSource.addFeature(lineFeature);
    });

    // Numbered waypoint markers
    projectedCoordinates.forEach((coord, index) => {
      const pointFeature = new Feature({ geometry: new Point(coord), waypointIndex: index + 1 });
      pointFeature.setStyle(this.createWaypointStyle(index + 1));
      this.flightPathSource.addFeature(pointFeature);
    });
  }

  /**
   * Renders only the center marker for a POI plan with no waypoints.
   */
  private renderPoiCenterOnly(plan: import('../api/models/flight-plan-response').FlightPlanResponse): void {
    // If plan has POI parameters with center, show the center marker
    // For now just clear — center coords would need to come from plan metadata
    this.clearFlightPath();
  }
}
