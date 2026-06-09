export type IndustryType = 'manufacturing' | 'electrical' | 'mechanical' | 'hvac' | 'robotics';

export interface IndustryMetadata {
  id: IndustryType;
  name: string;
  sensors: {
    key: string;
    name: string;
    unit: string;
    min: number;
    max: number;
    nominalMin: number;
    nominalMax: number;
  }[];
  commonFaults: string[];
  logPrefix: string;
}

export interface SensorReading {
  timestamp: string;
  values: Record<string, number>;
  status: 'nominal' | 'warning' | 'critical';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'CSV' | 'IoT' | 'PLC' | 'SCADA' | 'Error Log';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface DiagnosticResult {
  faultDetected: boolean;
  failureCategory: string;
  probabilityScore: number;
  rootCause: string;
  suggestedFixes: string[];
  preventiveAction: string;
  maintenanceSchedule: string;
  riskAssessment: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface DiagnosticReport extends DiagnosticResult {
  id: string;
  timestamp: string;
  industry: IndustryType;
  sensorSnapshot: Record<string, number>;
  logsAnalyzed: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'operator' | 'ai';
  text: string;
  timestamp: string;
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  workstationId: string;
  shiftType: 'Day (06:00 - 14:00)' | 'Swing (14:00 - 22:00)' | 'Night (22:00 - 06:00)';
  activeSince: string;
}

export const INDUSTRIES: Record<IndustryType, IndustryMetadata> = {
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing & Assembly',
    sensors: [
      { key: 'spindleTemp', name: 'Spindle Temperature', unit: '°C', min: 20, max: 120, nominalMin: 35, nominalMax: 78 },
      { key: 'vibration', name: 'Axis Vibration', unit: 'mm/s', min: 0.1, max: 15.0, nominalMin: 0.5, nominalMax: 3.2 },
      { key: 'feedRate', name: 'Feed Rate Precision', unit: '%', min: 50, max: 150, nominalMin: 95, nominalMax: 105 },
      { key: 'motorCurrent', name: 'Motor Load Current', unit: 'A', min: 1, max: 60, nominalMin: 12, nominalMax: 28 },
    ],
    commonFaults: [
      'Bearing lubrication failure on axis spindle motor-3',
      'Sudden feedrate drop and micro-slippage in tooling head',
      'Overheating in cutting coolant circulation manifold',
    ],
    logPrefix: 'MFG-PLC'
  },
  electrical: {
    id: 'electrical',
    name: 'Electrical Distribution Grid',
    sensors: [
      { key: 'voltage', name: 'Grid Frequency Voltage', unit: 'V', min: 380, max: 480, nominalMin: 410, nominalMax: 430 },
      { key: 'currentHarmonics', name: 'Harmonic Distortion', unit: '%', min: 0.5, max: 12.0, nominalMin: 1.0, nominalMax: 4.5 },
      { key: 'powerFactor', name: 'Power Factor (cos phi)', unit: '', min: 0.5, max: 1.0, nominalMin: 0.88, nominalMax: 0.99 },
      { key: 'transformerTemp', name: 'Transformer Core Temp', unit: '°C', min: 15, max: 110, nominalMin: 30, nominalMax: 70 },
    ],
    commonFaults: [
      'Phase imbalance detected on primary bus line A-2',
      'Transformer secondary winding insulating fluid leakage',
      'Harmonic resonance spike in local capacitor bank-7',
    ],
    logPrefix: 'GRID-SCADA'
  },
  mechanical: {
    id: 'mechanical',
    name: 'Heavy Mechanical Transmission',
    sensors: [
      { key: 'torque', name: 'Driveshaft Torque', unit: 'Nm', min: 50, max: 1500, nominalMin: 200, nominalMax: 850 },
      { key: 'gearboxTemp', name: 'Gearbox Sump Coolant', unit: '°C', min: 10, max: 95, nominalMin: 25, nominalMax: 65 },
      { key: 'acousticEmissions', name: 'Ultrasonic Noise', unit: 'dB', min: 20, max: 90, nominalMin: 30, nominalMax: 55 },
      { key: 'oilPressure', name: 'Lube Oil Pressure', unit: 'bar', min: 0.5, max: 8.0, nominalMin: 2.5, nominalMax: 5.0 },
    ],
    commonFaults: [
      'Gearing tooth misalignment in central planetary stage',
      'Lubrication pump cavitating due to micro-debris flow',
      'Driveshaft fatigue micro-fissure resonance surge',
    ],
    logPrefix: 'MECH-PLC'
  },
  hvac: {
    id: 'hvac',
    name: 'Industrial HVAC Plant',
    sensors: [
      { key: 'compressorPressure', name: 'High-Side Refrigerant Pres', unit: 'psi', min: 100, max: 400, nominalMin: 180, nominalMax: 260 },
      { key: 'fanVibration', name: 'Chilled Air Fan Jitter', unit: 'mm/s', min: 0.1, max: 12.0, nominalMin: 0.2, nominalMax: 2.5 },
      { key: 'airflow', name: 'Ventilation Airflow Speed', unit: 'm³/h', min: 500, max: 8000, nominalMin: 4500, nominalMax: 6000 },
      { key: 'outletTemp', name: 'Output Supply Air Temp', unit: '°C', min: 4, max: 35, nominalMin: 8, nominalMax: 18 },
    ],
    commonFaults: [
      'Refrigerant gas micro-leakage in vaporizing coils',
      'Primary intake damper actuator stiction blocking travel',
      'Variable-frequency blower fan alignment imbalance',
    ],
    logPrefix: 'HVAC-RTU'
  },
  robotics: {
    id: 'robotics',
    name: 'Multi-Axis Robotic Arm',
    sensors: [
      { key: 'jointTemp', name: 'Joint-3 Servomotor Temp', unit: '°C', min: 15, max: 95, nominalMin: 25, nominalMax: 58 },
      { key: 'encoderJitter', name: 'Rotary Encoder Angular Jitter', unit: '°/s²', min: 0.001, max: 0.5, nominalMin: 0.002, nominalMax: 0.04 },
      { key: 'batteryBackup', name: 'Memory Controller Charge', unit: 'V', min: 1.5, max: 4.2, nominalMin: 3.1, nominalMax: 3.8 },
      { key: 'currentConsumption', name: 'Dynamic Joint Servos Load', unit: 'A', min: 0.1, max: 15.0, nominalMin: 1.5, nominalMax: 5.5 },
    ],
    commonFaults: [
      'Rotary joint position overshoot in robotic arm wrist-J4',
      'Servo amplifier feedback fault due to sensor signal noise',
      'Backlash error on precision cycloidal drive reduction gearbox',
    ],
    logPrefix: 'ROBOT-CTRL'
  }
};
