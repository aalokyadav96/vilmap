import maplibregl from 'maplibre-gl';
import { fetchRoute, POIFeature, POIFeatureCollection } from './api';

export class VillageMap {
  private map: maplibregl.Map;
  private selectedDestination: [number, number] | null = null;
  private startLocation: [number, number] = [76.1532, 28.2415]; // Default Village Center

  constructor(containerId: string) {
    // Initialize Maplibre GL map with Dark Map style
    this.map = new maplibregl.Map({
      container: containerId,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [76.1540, 28.2420], // Village center [lng, lat]
      zoom: 16,
      pitch: 30, // Slight 3D tilt like GTA Radar
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    this.map.on('load', () => {
      this.initRouteLayers();
      this.setupMapClick();
    });
  }

  // Add Route GeoJSON LineString Source and GTA Yellow Layer
  private initRouteLayers() {
    this.map.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
        properties: {},
      },
    });

    // GTA SAN ANDREAS Yellow Route Line
    this.map.addLayer({
      id: 'route-layer',
      type: 'line',
      source: 'route-source',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#ffcc00', // GTA Radar Yellow
        'line-width': 6,
        'line-opacity': 0.85,
      },
    });
  }

  // Load custom SVG/PNG markers for GTA POIs
  public loadPOIs(poiCollection: POIFeatureCollection, onSelectPOI: (poi: POIFeature) => void) {
    poiCollection.features.forEach((poi) => {
      const el = document.createElement('div');
      el.className = 'gta-marker';
      
      // Inline SVGs for GTA Icons
      if (poi.properties.icon === 'gta-house') {
        el.innerHTML = `🏠`;
        el.style.fontSize = '24px';
      } else if (poi.properties.icon === 'gta-pizza') {
        el.innerHTML = `🍕`;
        el.style.fontSize = '24px';
      } else if (poi.properties.icon === 'gta-barber') {
        el.innerHTML = `💈`;
        el.style.fontSize = '24px';
      } else {
        el.innerHTML = `📍`;
        el.style.fontSize = '24px';
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDestination = poi.geometry.coordinates;
        onSelectPOI(poi);
      });

      new maplibregl.Marker({ element: el })
        .setLngLat(poi.geometry.coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <strong style="color:#000;">${poi.properties.name}</strong><br/>
            <span style="color:#555;">${poi.properties.description}</span>
          `)
        )
        .addTo(this.map);
    });
  }

  // Handle map click to pick custom destination point
  private setupMapClick() {
    this.map.on('click', (e: maplibregl.MapMouseEvent) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      this.selectedDestination = coords;

      const labelBox = document.getElementById('dest-label');
      const routeBtn = document.getElementById('btn-route') as HTMLButtonElement;

      if (labelBox) {
        labelBox.innerText = `Custom Point: (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`;
      }
      if (routeBtn) {
        routeBtn.disabled = false;
      }
    });
  }

  // Trigger Dijkstra Path Request to Go Backend & Draw Line
  public async drawRouteToSelected() {
    if (!this.selectedDestination) return;

    try {
      const routeData = await fetchRoute(
        this.startLocation[0],
        this.startLocation[1],
        this.selectedDestination[0],
        this.selectedDestination[1]
      );

      // Update Map Source with line coordinates
      const source = this.map.getSource('route-source') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(routeData);
      }

      // Update HUD stats
      const distElem = document.getElementById('route-distance');
      const timeElem = document.getElementById('route-time');

      if (distElem) distElem.innerText = `DISTANCE: ${routeData.properties.total_distance_m.toFixed(0)} M`;
      if (timeElem) timeElem.innerText = `TIME: ${routeData.properties.duration_sec.toFixed(0)} SEC`;

      // Zoom to fit route
      const bounds = routeData.geometry.coordinates.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(routeData.geometry.coordinates[0], routeData.geometry.coordinates[0])
      );

      this.map.fitBounds(bounds, { padding: 80 });
    } catch (err) {
      console.error('Failed to compute route', err);
      alert('Could not compute route from backend.');
    }
  }

  // Clear drawn path
  public clearRoute() {
    const source = this.map.getSource('route-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {},
      });
    }

    const distElem = document.getElementById('route-distance');
    const timeElem = document.getElementById('route-time');
    const labelBox = document.getElementById('dest-label');
    const routeBtn = document.getElementById('btn-route') as HTMLButtonElement;

    if (distElem) distElem.innerText = 'DISTANCE: -- M';
    if (timeElem) timeElem.innerText = 'TIME: -- SEC';
    if (labelBox) labelBox.innerText = 'Click a POI or point on map';
    if (routeBtn) routeBtn.disabled = true;

    this.selectedDestination = null;
  }

  public flyTo(coords: [number, number]) {
    this.map.flyTo({ center: coords, zoom: 17, speed: 1.2 });
  }
}