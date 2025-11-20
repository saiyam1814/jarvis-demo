
export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM',
  CLOSED_FIST = 'CLOSED_FIST',
  PINCH = 'PINCH',
  POINTING = 'POINTING',
  VICTORY = 'VICTORY',
  THUMBS_UP = 'THUMBS_UP'
}

export enum AppMode {
  LOCKED = 'LOCKED',      // Waiting for hand scan
  SCANNING = 'SCANNING',  // Hand detected, verifying
  ACTIVE = 'ACTIVE',      // Unlocked, drawing mode
  MINECRAFT = 'MINECRAFT', // Voxel mode
  SKELETON = 'SKELETON'   // Music/Bone mode
}

export interface DrawingPoint {
  x: number;
  y: number;
  isGap: boolean; // If true, this point is a break in the line (pen up)
}

export interface HandGestureState {
  type: GestureType;
  position: { x: number; y: number }; // Normalized 0-1
  pinchDistance?: number;
}

export interface HeadTelemetry {
  rotation: { x: number; y: number; z: number };
  detected: boolean;
}

export interface TerminalMessage {
  id: string;
  text: string;
  timestamp: number;
}

export interface CityData {
  name: string;
  population: string;
  temp: string;
  coordinates: [number, number];
}

export interface AppState {
  mode: AppMode;
  scanProgress: number; // 0 to 100
  isSystemReady: boolean;
  fps: number;
  telemetry: HeadTelemetry;
  currentMessage: TerminalMessage | null;
  gesture: HandGestureState;
  selectedCity: CityData | null;
  drawingPath: DrawingPoint[];
  userTypedText: string; // New field for keyboard input
  hologramText: string; // Text displayed as 3D hologram
  isMatrixActive: boolean; // Triggered by eyebrows
  isSmiling: boolean; // Triggered by smile
  isProcessing: boolean; // Simulating AI processing
  rawLandmarks: any[]; // For skeleton drawing
}