const API_BASE = 'http://localhost:4000/api';

export interface POIProperties {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
}

export interface POIFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: POIProperties;
}

export interface POIFeatureCollection {
  type: 'FeatureCollection';
  features: POIFeature[];
}

export interface RouteStep {
  instruction: string;
  distance_m: number;
  location: [number, number];
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
    steps: RouteStep[];
  };
}

// Fetch POI list from Go Backend
export async function fetchPOIs(): Promise<POIFeatureCollection> {
  const res = await fetch(`${API_BASE}/pois`);
  if (!res.ok) throw new Error('Failed to fetch POIs from server');
  return res.json();
}

// Fetch Shortest Route from Go Dijkstra Engine
export async function fetchRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<RouteResponse> {
  const url = `${API_BASE}/route?start_lat=${startLat}&start_lng=${startLng}&end_lat=${endLat}&end_lng=${endLng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch route');
  return res.json();
}