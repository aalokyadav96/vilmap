import maplibregl from 'maplibre-gl';
import { BusVehicle } from './types';

export function interpolateAlongPath(path: [number, number][], progress: number): [number, number] {
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

export function startTransitAnimation(
  busVehicles: BusVehicle[],
  busMarkers: maplibregl.Marker[]
) {
  const tick = () => {
    busVehicles.forEach((vehicle, index) => {
      const marker = busMarkers[index];
      if (!marker) return;

      vehicle.progress = (vehicle.progress + 0.003) % 1;
      const current = interpolateAlongPath(vehicle.path, vehicle.progress);
      marker.setLngLat(current);
    });
  };

  window.setInterval(tick, 1200);
}

export function startTurfAnimation(map: maplibregl.Map) {
  let opacity = 0.35;
  let increasing = false;

  window.setInterval(() => {
    opacity += increasing ? 0.05 : -0.05;
    if (opacity >= 0.65) increasing = false;
    if (opacity <= 0.2) increasing = true;

    if (map && map.getLayer('turf-fill')) {
      map.setPaintProperty('turf-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'contested'], 1],
        opacity,
        0.35,
      ]);
    }
  }, 200);
}