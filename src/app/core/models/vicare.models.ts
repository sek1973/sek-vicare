// ─── Generic API structures ───────────────────────────────────────────────────

export interface FeatureProperty {
    type: string;
    value: unknown;
    unit?: string;
}

export interface FeatureCommandParam {
    type: string;
    constraints?: {
        minValue?: number;
        maxValue?: number;
        stepping?: number;
        enumType?: string[];
    };
}

export interface FeatureCommand {
    isExecutable: boolean;
    params?: Record<string, FeatureCommandParam>;
}

export interface VicareFeature {
    feature: string;
    properties: Record<string, FeatureProperty>;
    isEnabled: boolean;
    isReady: boolean;
    commands: Record<string, FeatureCommand>;
    timestamp: string;
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export interface VicareDevice {
    id: string;
    type: string;
    modelId: string;
    status: string;
}

export interface VicareGateway {
    serial: string;
    version: string;
    autoUpdate: boolean;
    devices: VicareDevice[];
}

export interface VicareInstallation {
    id: number;
    description: string;
    address: {
        street: string;
        houseNumber: string;
        zip: string;
        city: string;
        country: string;
    };
    gateways: VicareGateway[];
}

// ─── Parsed domain models ─────────────────────────────────────────────────────

export interface ZoneInfo {
    id: string;
    name: string;
    roomTemperature: number | null;
    targetTemperature: number | null;
    activeMode: string | null;
    valveOpen: boolean | null;
    /** Constraints for changing target temperature */
    temperatureConstraints: { min: number; max: number; step: number } | null;
}

export interface CircuitInfo {
    id: string;
    operatingMode: string | null;
    activeProgram: string | null;
    supplyTemperature: number | null;
    programs: ProgramInfo[];
    availableModes: string[];
}

export interface ProgramInfo {
    name: string;
    temperature: number | null;
    isActive: boolean;
    constraints: { min: number; max: number; step: number } | null;
}

export interface DashboardData {
    boilerTemperature: number | null;
    outsideTemperature: number | null;
    dhwStorageTemperature: number | null;
    dhwTargetTemperature: number | null;
    dhwTargetConstraints: { min: number; max: number; step: number } | null;
    burnerActive: boolean;
    burnerModulation: number | null;
    burnerHours: number | null;
    circuits: CircuitInfo[];
    zones: ZoneInfo[];
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface TemperatureReading {
    timestamp: number;
    featureName: string;
    value: number;
}

export interface DeviceContext {
    installationId: number;
    gatewaySerial: string;
    deviceId: string;
    installationDescription: string;
    deviceModel: string;
}
