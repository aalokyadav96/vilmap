export type IncidentSeverity = 'critical' | 'warning' | 'info';

export type IncidentData = {
  id: string;
  title: string;
  description: string;
  type: 'Emergency' | 'Utility' | 'Traffic';
  severity: IncidentSeverity;
  coords: [number, number];
  icon: string;
};

export type PropertyParcel = {
  id: string;
  name: string;
  owner: string;
  taxStatus: string;
  utilities: string[];
  value: string;
  polygon: [number, number][];
  height: number;
};

export type CameraFeed = {
  id: string;
  title: string;
  zone: string;
  coords: [number, number];
  status: 'LIVE' | 'STANDBY';
};

export type BusStop = {
  id: string;
  name: string;
  coords: [number, number];
  eta: number[];
};

export type BusVehicle = {
  id: string;
  route: string;
  color: string;
  path: [number, number][];
  progress: number;
};

export type Territory = {
  id: string;
  name: string;
  gang: string;
  color: string;
  contested: boolean;
  polygon: [number, number][];
};