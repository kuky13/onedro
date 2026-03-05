export interface TestSession {
  id: string;
  service_order_id: string | null;
  share_token: string;
  device_info: DeviceInfo;
  test_results: TestResults;
  overall_score: number | null;
  status: "pending" | "in_progress" | "completed" | "expired";
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DeviceInfo {
  user_agent?: string;
  screen_resolution?: string;
  platform?: string;
  language?: string;
  viewport?: string;
}

export interface TestResult {
  status: "passed" | "failed" | "skipped" | "pending";
  score?: number;
  duration_ms?: number;
  error?: string;
  details?: TestDetails;
  completed_at?: string;
}

// Detailed test results for each test type
export interface TestDetails {
  // Touch test
  touchedCells?: number;
  totalCells?: number;
  completionRate?: number;

  // Color test
  colors?: Record<string, boolean>;
  passedCount?: number;
  totalColors?: number;

  // Audio/Mic test
  recordingDuration?: number;
  maxLevel?: string;
  quality?: string;

  // Camera test
  facing?: "user" | "environment";
  hasCapturedImage?: boolean;
  resolution?: { width: number; height: number };
  flashUsed?: boolean;

  // Vibration test
  patterns?: Record<string, boolean>;
  testedPatterns?: string[];
  totalPatterns?: number;

  // Button test
  buttons?: Record<string, boolean>;
  autoDetected?: Record<string, boolean>;
  manualTested?: Record<string, boolean>;
  testedCount?: number;
  workingCount?: number;

  // Battery test
  level?: number;
  charging?: boolean;
  chargingTime?: number | null;
  dischargingTime?: number | null;
  estimatedAmps?: string;
  estimatedVolts?: string;
  estimatedWatts?: string;
  chargingSpeed?: string;

  // Sensor test
  hasMovement?: boolean;
  accelerometer?: boolean;
  gyroscope?: boolean;
  proximityTested?: boolean;
  proximitySupported?: boolean;
  accelerometerValues?: { x: number; y: number; z: number };
  gyroscopeValues?: { alpha: number; beta: number; gamma: number };
  proximityNear?: boolean | null;

  // Location/GPS test
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  gpsWorking?: boolean;

  // General
  reason?: string;
  state?: string;
  manual?: boolean;
  notes?: string;

  // Allow additional properties
  [key: string]: any;
}

export type TestResults = Record<string, TestResult>;

export interface TestConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "display" | "audio" | "camera" | "sensors" | "system";
  optional?: boolean;
}

export const TESTS_CONFIG: TestConfig[] = [
  {
    id: "display_touch",
    label: "Touch Screen",
    description: "Toque em todas as áreas da tela",
    icon: "Hand",
    category: "display",
  },
  {
    id: "display_colors",
    label: "Cores e Pixels",
    description: "Verifique se há manchas ou pixels mortos",
    icon: "Palette",
    category: "display",
  },
  {
    id: "audio_speaker",
    label: "Alto-falante",
    description: "Teste o áudio do dispositivo",
    icon: "Volume2",
    category: "audio",
  },
  {
    id: "audio_mic",
    label: "Microfone",
    description: "Grave e reproduza áudio",
    icon: "Mic",
    category: "audio",
  },
  {
    id: "camera_front",
    label: "Câmera Frontal",
    description: "Teste a câmera frontal",
    icon: "Camera",
    category: "camera",
  },
  {
    id: "camera_back",
    label: "Câmera Traseira",
    description: "Teste a câmera traseira",
    icon: "Camera",
    category: "camera",
  },
  {
    id: "vibration",
    label: "Vibração",
    description: "Teste o motor de vibração",
    icon: "Vibrate",
    category: "sensors",
  },
  {
    id: "buttons",
    label: "Botões Físicos",
    description: "Teste os botões de volume e power",
    icon: "ToggleRight",
    category: "sensors",
  },
  {
    id: "battery",
    label: "Bateria",
    description: "Verifique informações da bateria",
    icon: "Battery",
    category: "system",
  },
  {
    id: "sensors",
    label: "Sensores",
    description: "Teste acelerômetro, giroscópio e proximidade",
    icon: "Gauge",
    category: "sensors",
    optional: true,
  },
  {
    id: "location",
    label: "Localização",
    description: "Verifique o GPS do dispositivo",
    icon: "MapPin",
    category: "sensors",
    optional: true,
  },
];

export const MANUAL_TESTS_CONFIG: TestConfig[] = [
  // Display
  { id: "display_integro", label: "Display Íntegro", description: "Verifique se a tela não possui trincados ou quebras", icon: "Smartphone", category: "display" },
  // Audio
  { id: "alto_falante_auricular", label: "Alto-falante Auricular", description: "Verifique o áudio de chamadas", icon: "Ear", category: "audio" },
  { id: "entrada_fone", label: "Entrada Fone/P2", description: "Teste a entrada de fones de ouvido", icon: "Headphones", category: "audio" },
  // Cameras
  { id: "foco_automatico", label: "Foco Automático", description: "Verifique se o foco da câmera está funcionando", icon: "Focus", category: "camera" },
  // Sistema
  { id: "bluetooth", label: "Bluetooth", description: "Verifique se o bluetooth conecta em dispositivos", icon: "Bluetooth", category: "system" },
  // Extras (mapped to "sensors" or "system" to show properly on UI if we don't have an "extras" category yet, but TestConfig only allows "display" | "audio" | "camera" | "sensors" | "system". Let's use "system" for extras)
  { id: "face_id", label: "Face ID", description: "Verifique o reconhecimento facial", icon: "ScanFace", category: "system" },
  { id: "biometria", label: "Biometria", description: "Verifique o leitor de impressão digital", icon: "Fingerprint", category: "system" },
  { id: "nfc", label: "NFC", description: "Teste o pagamento por aproximação", icon: "CreditCard", category: "system" },
  { id: "chip_sim", label: "Chip SIM", description: "Teste a leitura e sinal do chip", icon: "SimCard", category: "system" },
  { id: "tampa_traseira_ok", label: "Tampa Traseira OK", description: "Verifique se a tampa está íntegra", icon: "ShieldCheck", category: "system" }
];

