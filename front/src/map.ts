import maplibregl from 'maplibre-gl';
import { fetchRoute, POIFeature, POIFeatureCollection, VehicleLocation } from './api';

type IncidentSeverity = 'critical' | 'warning' | 'info';

type IncidentData = {
  id: string;
  title: string;
  description: string;
  type: 'Emergency' | 'Utility' | 'Traffic';
  severity: IncidentSeverity;
  coords: [number, number];
  icon: string;
};

type PropertyParcel = {
  id: string;
  name: string;
  owner: string;
  taxStatus: string;
  utilities: string[];
  value: string;
  polygon: [number, number][];
  height: number;
};

type CameraFeed = {
  id: string;
  title: string;
  zone: string;
  coords: [number, number];
  status: 'LIVE' | 'STANDBY';
};

type BusStop = {
  id: string;
  name: string;
  coords: [number, number];
  eta: number[];
};

type BusVehicle = {
  id: string;
  route: string;
  color: string;
  path: [number, number][];
  progress: number;
};

export class VillageMap {
  private map: maplibregl.Map;
  private selectedDestination: [number, number] | null = null;
  private startLocation: [number, number] = [76.1532, 28.2415];
  private vehicleMarkers: Map<string, maplibregl.Marker> = new Map();
  private incidentMarkers: maplibregl.Marker[] = [];
  private cctvMarkers: maplibregl.Marker[] = [];
  private busStopMarkers: maplibregl.Marker[] = [];
  private busMarkers: maplibregl.Marker[] = [];
  private infoCard: HTMLDivElement | null = null;
  private propertyData: PropertyParcel[] = [
    {
      id: 'prop-101',
      name: 'Market Row Tower',
      owner: 'Northside Holdings LLC',
      taxStatus: 'Current',
      utilities: ['Power', 'Water', 'Fiber'],
      value: '$1.2M',
      polygon: [
        [76.1505, 28.2415],
        [76.1518, 28.2415],
        [76.1518, 28.2428],
        [76.1505, 28.2428],
        [76.1505, 28.2415],
      ],
      height: 28,
    },
    {
      id: 'prop-204',
      name: 'Sector 3 Apartments',
      owner: 'Oakline Residency Co.',
      taxStatus: 'Overdue',
      utilities: ['Power', 'Gas', 'Water'],
      value: '$920K',
      polygon: [
        [76.1568, 28.2432],
        [76.1588, 28.2432],
        [76.1588, 28.2448],
        [76.1568, 28.2448],
        [76.1568, 28.2432],
      ],
      height: 22,
    },
    {
      id: 'prop-309',
      name: 'Harbor Depot',
      owner: 'Municipal Services',
      taxStatus: 'Current',
      utilities: ['Power', 'Water', 'Internet'],
      value: '$1.8M',
      polygon: [
        [76.1528, 28.2394],
        [76.1552, 28.2394],
        [76.1552, 28.2408],
        [76.1528, 28.2408],
        [76.1528, 28.2394],
      ],
      height: 18,
    },
  ];

  private incidentData: IncidentData[] = [
    {
      id: 'incident-1',
      title: 'Fallen Tree on Market Lane',
      description: 'Large tree down across the eastbound lane. Traffic control in progress.',
      type: 'Emergency',
      severity: 'critical',
      coords: [76.1517, 28.2426],
      icon: '🚨',
    },
    {
      id: 'incident-2',
      title: 'Water Leak at Sector 3',
      description: 'Supply pipe breach affecting the lower distribution line. Utility team dispatched.',
      type: 'Utility',
      severity: 'warning',
      coords: [76.1584, 28.2441],
      icon: '💧',
    },
    {
      id: 'incident-3',
      title: 'Traffic Bottleneck',
      description: 'Queue forming near the town square due to roadworks and public event congestion.',
      type: 'Traffic',
      severity: 'info',
      coords: [76.1543, 28.2429],
      icon: '🚦',
    },
  ];

  private cctvData: CameraFeed[] = [
    { id: 'cam-1', title: 'Market Cross', zone: 'Town Square', coords: [76.1527, 28.2421], status: 'LIVE' },
    { id: 'cam-2', title: 'North Grove', zone: 'Residential Loop', coords: [76.1561, 28.2434], status: 'LIVE' },
    { id: 'cam-3', title: 'Harbor Junction', zone: 'Commercial District', coords: [76.1541, 28.2398], status: 'STANDBY' },
  ];

  private busStops: BusStop[] = [
    { id: 'stop-1', name: 'Market Square', coords: [76.1514, 28.2422], eta: [4, 9, 17] },
    { id: 'stop-2', name: 'Civic Hall', coords: [76.1548, 28.2444], eta: [6, 12, 22] },
    { id: 'stop-3', name: 'Harbor Point', coords: [76.1558, 28.2402], eta: [3, 11, 19] },
  ];

  private busVehicles: BusVehicle[] = [
    {
      id: 'bus-1',
      route: 'River Loop',
      color: '#46d2ff',
      path: [
        [76.1514, 28.2422],
        [76.1533, 28.2428],
        [76.1549, 28.2444],
        [76.1567, 28.2437],
        [76.1558, 28.2402],
      ],
      progress: 0.15,
    },
    {
      id: 'bus-2',
      route: 'School Shuttle',
      color: '#ffcc00',
      path: [
        [76.1561, 28.2434],
        [76.1550, 28.2428],
        [76.1521, 28.2419],
        [76.1498, 28.2411],
      ],
      progress: 0.58,
    },
  ];

  constructor(containerId: string) {
    this.map = new maplibregl.Map({
      container: containerId,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [76.1540, 28.2420],
      zoom: 16,
      pitch: 30,
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    this.map.on('load', () => {
      this.initRouteLayers();
      this.initEmergencyDispatch();
      this.initPropertyInspection();
      this.initCCTVSystem();
      this.initTransitTracker();
    });
  }

  private initRouteLayers() {
    this.map.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {},
      },
    });

    this.map.addLayer({
      id: 'route-layer',
      type: 'line',
      source: 'route-source',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#ffcc00',
        'line-width': 6,
        'line-opacity': 0.85,
      },
    });
  }

  private initEmergencyDispatch() {
    this.incidentData.forEach((incident) => {
      const el = document.createElement('div');
      el.className = `incident-marker incident-${incident.severity}`;
      el.innerHTML = incident.icon;
      el.title = incident.title;

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.showInfoCard(
          incident.title,
          `${incident.type} • ${incident.severity.toUpperCase()}`,
          `
            <div class="feature-meta-row">
              <span class="status-pill ${incident.severity}">${incident.severity}</span>
              <span class="status-pill type">${incident.type}</span>
            </div>
            <p>${incident.description}</p>
            <div class="feature-meta-box">
              <strong>Dispatch Status:</strong> Crew en route
            </div>
            <div class="feature-meta-box">
              <strong>Location:</strong> ${incident.coords[0].toFixed(4)}, ${incident.coords[1].toFixed(4)}
            </div>
          `
        );
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(incident.coords).addTo(this.map);
      this.incidentMarkers.push(marker);
    });
  }

  private initPropertyInspection() {
    const features = this.propertyData.map((parcel) => ({
      type: 'Feature' as const,
      properties: {
        id: parcel.id,
        name: parcel.name,
        owner: parcel.owner,
        taxStatus: parcel.taxStatus,
        utilities: parcel.utilities.join(', '),
        value: parcel.value,
        height: parcel.height,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [parcel.polygon],
      },
    }));

    this.map.addSource('property-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    this.map.addLayer({
      id: 'property-base-layer',
      type: 'fill-extrusion',
      source: 'property-source',
      paint: {
        'fill-extrusion-color': '#2d9cdb',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.38,
      },
    });

    this.map.addSource('property-highlight-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    this.map.addLayer({
      id: 'property-highlight-layer',
      type: 'fill-extrusion',
      source: 'property-highlight-source',
      paint: {
        'fill-extrusion-color': '#67e8f9',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.82,
      },
    });

    this.map.on('click', 'property-base-layer', (event) => {
      const feature = event.features?.[0];
      if (!feature || !feature.properties) return;

      const parcelId = String(feature.properties.id ?? '');
      const parcel = this.propertyData.find((entry) => entry.id === parcelId);
      if (!parcel) return;

      this.setPropertyHighlight(parcelId);
      this.showInfoCard(
        parcel.name,
        'Property inspection report',
        `
          <div class="feature-meta-row">
            <span class="status-pill success">${parcel.taxStatus}</span>
            <span class="status-pill type">${parcel.value}</span>
          </div>
          <div class="feature-meta-box"><strong>Owner:</strong> ${parcel.owner}</div>
          <div class="feature-meta-box"><strong>Property ID:</strong> ${parcel.id}</div>
          <div class="feature-meta-box"><strong>Utilities:</strong> ${parcel.utilities.join(' • ')}</div>
          <div class="feature-meta-box"><strong>Inspection:</strong> Structural survey complete · neon mesh active</div>
        `
      );
    });
  }

  private setPropertyHighlight(propertyId: string) {
    const selected = this.propertyData.find((parcel) => parcel.id === propertyId);
    if (!selected) {
      const source = this.map.getSource('property-highlight-source') as maplibregl.GeoJSONSource;
      source?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const feature = {
      type: 'Feature' as const,
      properties: {
        id: selected.id,
        height: selected.height,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [selected.polygon],
      },
    };

    const source = this.map.getSource('property-highlight-source') as maplibregl.GeoJSONSource;
    source?.setData({ type: 'FeatureCollection', features: [feature] });
  }

  private initCCTVSystem() {
    this.cctvData.forEach((camera) => {
      const el = document.createElement('div');
      el.className = 'cctv-marker';
      el.innerHTML = '📹';
      el.title = `${camera.title} · ${camera.status}`;

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.showInfoCard(
          camera.title,
          `${camera.zone} • ${camera.status}`,
          `
            <div class="cctv-feed">
              <div class="feed-scanline"></div>
              <div class="feed-overlay"></div>
            </div>
            <div class="feature-meta-box"><strong>Camera ID:</strong> ${camera.id}</div>
            <div class="feature-meta-box"><strong>Zone:</strong> ${camera.zone}</div>
            <div class="feature-meta-box"><strong>Status:</strong> ${camera.status} · motion tracking active</div>
          `
        );
      });

      const marker = new maplibregl.Marker({ element: el }).setLngLat(camera.coords).addTo(this.map);
      this.cctvMarkers.push(marker);
    });
  }

  private initTransitTracker() {
    this.busStops.forEach((stop) => {
      const el = document.createElement('div');
      el.className = 'bus-stop-marker';
      el.innerHTML = '🚏';
      el.title = stop.name;

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        const etaList = stop.eta.map((value, index) => `<li>Stop ${index + 1}: ${value} min</li>`).join('');
        this.showInfoCard(
          stop.name,
          'Transit status',
          `
            <div class="feature-meta-box"><strong>Next arrivals</strong></div>
            <ul class="eta-list">${etaList}</ul>
            <div class="feature-meta-box"><strong>Route:</strong> River Loop • School Shuttle</div>
          `
        );
      });

      const marker = new maplibregl.Marker({ element: el }).setLngLat(stop.coords).addTo(this.map);
      this.busStopMarkers.push(marker);
    });

    this.busVehicles.forEach((vehicle) => {
      const el = document.createElement('div');
      el.className = 'bus-vehicle-marker';
      el.style.background = vehicle.color;
      el.innerHTML = '🚌';
      el.title = `${vehicle.route} bus`;

      const marker = new maplibregl.Marker({ element: el }).setLngLat(vehicle.path[0]).addTo(this.map);
      this.busMarkers.push(marker);
    });

    this.animateTransit();
  }

  private animateTransit() {
    const tick = () => {
      this.busVehicles.forEach((vehicle, index) => {
        const marker = this.busMarkers[index];
        if (!marker) return;

        vehicle.progress = (vehicle.progress + 0.003) % 1;
        const current = this.interpolateAlongPath(vehicle.path, vehicle.progress);
        marker.setLngLat(current);
      });
    };

    window.setInterval(tick, 1200);
  }

  private interpolateAlongPath(path: [number, number][], progress: number): [number, number] {
    const totalSegments = path.length - 1;
    const scaled = progress * totalSegments;
    const segmentIndex = Math.min(Math.floor(scaled), totalSegments - 1);
    const segmentProgress = scaled - segmentIndex;

    const start = path[segmentIndex];
    const end = path[Math.min(segmentIndex + 1, path.length - 1)];

    return [
      start[0] + (end[0] - start[0]) * segmentProgress,
      start[1] + (end[1] - start[1]) * segmentProgress,
    ];
  }

  private showInfoCard(title: string, subtitle: string, body: string) {
    if (!this.infoCard) {
      const card = document.createElement('div');
      card.className = 'feature-info-card hidden';
      card.innerHTML = `
        <div class="feature-info-header">
          <div>
            <h3></h3>
            <p></p>
          </div>
          <button type="button" aria-label="Close panel">×</button>
        </div>
        <div class="feature-info-body"></div>
      `;

      const closeButton = card.querySelector('button');
      closeButton?.addEventListener('click', () => card.classList.add('hidden'));
      document.body.appendChild(card);
      this.infoCard = card;
    }

    const header = this.infoCard.querySelector('h3');
    const subheader = this.infoCard.querySelector('p');
    const bodyEl = this.infoCard.querySelector('.feature-info-body');

    if (header) header.textContent = title;
    if (subheader) subheader.textContent = subtitle;
    if (bodyEl) bodyEl.innerHTML = body;

    this.infoCard.classList.remove('hidden');
  }

  // Load POI markers onto map
  public loadPOIs(poiCollection: POIFeatureCollection, onSelectPOI: (poi: POIFeature) => void) {
    poiCollection.features.forEach((poi) => this.addPOIMarker(poi, onSelectPOI));
  }

  public addPOIMarker(poi: POIFeature, onSelectPOI: (poi: POIFeature) => void) {
    const el = document.createElement('div');
    el.className = 'gta-marker';

    if (poi.properties.icon === 'gta-house') el.innerHTML = '🏠';
    else if (poi.properties.icon === 'gta-pizza') el.innerHTML = '🍕';
    else if (poi.properties.icon === 'gta-barber') el.innerHTML = '💈';
    else el.innerHTML = '📍';

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
  }

  public updateVehicleLocation(v: VehicleLocation) {
    let marker = this.vehicleMarkers.get(v.vehicle_id);

    if (!marker) {
      const el = document.createElement('div');
      el.className = 'vehicle-marker';

      marker = new maplibregl.Marker({ element: el })
        .setLngLat([v.lng, v.lat])
        .setPopup(new maplibregl.Popup().setText(`Patrol Unit: ${v.speed} km/h`))
        .addTo(this.map);

      this.vehicleMarkers.set(v.vehicle_id, marker);
    } else {
      marker.setLngLat([v.lng, v.lat]);
      const el = marker.getElement();
      el.style.transform = `rotate(${v.heading}deg)`;
    }
  }

  public setMapClickListener(callback: (coords: [number, number]) => void) {
    this.map.on('click', (e) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      this.selectedDestination = coords;
      callback(coords);
    });
  }

  public async drawRouteToSelected() {
    if (!this.selectedDestination) return;

    try {
      const routeData = await fetchRoute(
        this.startLocation[0],
        this.startLocation[1],
        this.selectedDestination[0],
        this.selectedDestination[1]
      );

      const source = this.map.getSource('route-source') as maplibregl.GeoJSONSource;
      if (source) source.setData(routeData);

      const distElem = document.getElementById('route-distance');
      const timeElem = document.getElementById('route-time');

      if (distElem) distElem.innerText = `DISTANCE: ${routeData.properties.total_distance_m.toFixed(0)} M`;
      if (timeElem) timeElem.innerText = `TIME: ${routeData.properties.duration_sec.toFixed(0)} SEC`;
    } catch (err) {
      console.error('Route calculation failed', err);
    }
  }

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
    if (labelBox) labelBox.innerText = 'Click a POI or map spot';
    if (routeBtn) routeBtn.disabled = true;

    this.selectedDestination = null;
  }

  public flyTo(coords: [number, number]) {
    this.map.flyTo({ center: coords, zoom: 17, speed: 1.2 });
  }
}