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

/**
 * Smooth 60fps transit animation using requestAnimationFrame and delta-time.
 */
export function startTransitAnimation(
  busVehicles: BusVehicle[],
  busMarkers: maplibregl.Marker[]
) {
  let lastTime = performance.now();
  const speedFactor = 0.000065;

  const animate = (currentTime: number) => {
    const deltaTime = Math.min(currentTime - lastTime, 40);
    lastTime = currentTime;

    busVehicles.forEach((vehicle, index) => {
      const marker = busMarkers[index];
      if (!marker) return;

      const nextProgress = (vehicle.progress + deltaTime * speedFactor) % 1;
      vehicle.progress = nextProgress;

      const current = interpolateAlongPath(vehicle.path, nextProgress);
      marker.setLngLat(current);

      const markerEl = marker.getElement();
      const busIcon = markerEl?.querySelector('.bus-vehicle-marker-inner') as HTMLElement | null;
      if (busIcon) {
        const nextPoint = interpolateAlongPath(vehicle.path, (nextProgress + 0.02) % 1);
        const dx = nextPoint[0] - current[0];
        const dy = nextPoint[1] - current[1];
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        busIcon.style.transform = `rotate(${angle}deg)`;
      }
    });

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

/**
 * Smooth breathing opacity pulse for turf territories using a sine wave.
 */
export function startTurfAnimation(map: maplibregl.Map) {
  const animate = (currentTime: number) => {
    // Generates a smooth oscillation between 0.2 and 0.65 over ~2 seconds
    const opacity = 0.425 + 0.225 * Math.sin(currentTime * 0.003);

    if (map && map.getLayer('turf-fill')) {
      map.setPaintProperty('turf-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'contested'], 1],
        opacity,
        0.35,
      ]);
    }

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}