const API_BASE = 'http://localhost:4000/api';

export interface POIProperties {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  images?: string[];
}

export interface POIFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: POIProperties;
}

export interface POIFeatureCollection {
  type: 'FeatureCollection';
  features: POIFeature[];
}

export interface RouteResponse {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    total_distance_m: number;
    duration_sec: number;
  };
}

export interface VehicleLocation {
  vehicle_id: string;
  type: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

// Fetch all POIs
export async function fetchPOIs(): Promise<POIFeatureCollection> {
  const res = await fetch(`${API_BASE}/pois`);
  if (!res.ok) throw new Error('Failed to fetch POIs');
  return res.json();
}

// Create new POI
export async function createPOI(poi: POIFeature): Promise<POIFeature> {
  const res = await fetch(`${API_BASE}/pois`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(poi),
  });
  if (!res.ok) throw new Error('Failed to create POI');
  return res.json();
}

// Get Route
export async function fetchRoute(
  startLng: number, startLat: number,
  endLng: number, endLat: number
): Promise<RouteResponse> {
  const url = `${API_BASE}/route?start_lat=${startLat}&start_lng=${startLng}&end_lat=${endLat}&end_lng=${endLng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch route');
  return res.json();
}