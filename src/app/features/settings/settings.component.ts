import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { VicareApiService } from '../../core/services/vicare-api.service';
import { DeviceContextService } from '../../core/services/device-context.service';
import { DashboardData, CircuitInfo } from '../../core/models/vicare.models';

interface DhwSettings {
    targetTemperature: number;
}

interface CircuitSettings {
    operatingMode: string;
    comfortTemperature: number;
    normalTemperature: number;
    reducedTemperature: number;
}

@Component({
    selector: 'app-settings',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatExpansionModule,
        MatDividerModule,
        FormsModule,
    ],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
    private readonly api = inject(VicareApiService);
    private readonly deviceCtx = inject(DeviceContextService);
    private readonly snackBar = inject(MatSnackBar);

    readonly loading = signal(false);
    readonly saving = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly data = signal<DashboardData | null>(null);

    dhwSettings: DhwSettings = { targetTemperature: 55 };
    circuitSettings: Record<string, CircuitSettings> = {};

    readonly dhwModes = ['off', 'dhwSchedule', 'forcedNormal'];
    readonly circuitModes = ['standby', 'dhw', 'dhwAndHeating', 'heating', 'forcedReduced', 'forcedNormal'];

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) { this.error.set('No device context.'); return; }
        this.loading.set(true);
        this.error.set(null);
        this.api.getDashboardData(ctx.installationId, ctx.gatewaySerial, ctx.deviceId).subscribe({
            next: (d) => {
                this.data.set(d);
                // Populate DHW editing state
                this.dhwSettings.targetTemperature = d.dhwTargetTemperature ?? 55;
                // Populate circuit editing state
                for (const c of d.circuits) {
                    const comfort = c.programs.find((p) => p.name === 'comfort');
                    const normal = c.programs.find((p) => p.name === 'normal');
                    const reduced = c.programs.find((p) => p.name === 'reduced');
                    this.circuitSettings[c.id] = {
                        operatingMode: c.operatingMode ?? 'dhwAndHeating',
                        comfortTemperature: comfort?.temperature ?? 21,
                        normalTemperature: normal?.temperature ?? 20,
                        reducedTemperature: reduced?.temperature ?? 16,
                    };
                }
                this.loading.set(false);
            },
            error: (e) => {
                this.error.set(`Failed to load settings: ${e?.message ?? 'Unknown error'}`);
                this.loading.set(false);
            },
        });
    }

    saveDhwTemperature(): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) return;
        this.saving.set('dhw-temp');
        this.api.executeCommand(
            ctx.installationId, ctx.gatewaySerial, ctx.deviceId,
            'heating.dhw.temperature.main', 'setTargetTemperature',
            { temperature: this.dhwSettings.targetTemperature }
        ).subscribe({
            next: () => { this.snackBar.open('DHW target temperature saved.', 'OK', { duration: 3000 }); this.saving.set(null); this.load(); },
            error: (e) => { this.snackBar.open(`Error: ${e?.error?.message ?? 'Command failed'}`, 'Dismiss', { duration: 5000 }); this.saving.set(null); },
        });
    }

    saveCircuitMode(circuitId: string): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) return;
        const mode = this.circuitSettings[circuitId]?.operatingMode;
        if (!mode) return;
        this.saving.set(`circuit-mode-${circuitId}`);
        this.api.executeCommand(
            ctx.installationId, ctx.gatewaySerial, ctx.deviceId,
            `heating.circuits.${circuitId}.operating.modes.active`, 'setMode',
            { mode }
        ).subscribe({
            next: () => { this.snackBar.open(`Circuit ${circuitId} mode saved.`, 'OK', { duration: 3000 }); this.saving.set(null); this.load(); },
            error: (e) => { this.snackBar.open(`Error: ${e?.error?.message ?? 'Command failed'}`, 'Dismiss', { duration: 5000 }); this.saving.set(null); },
        });
    }

    saveProgramTemperature(circuitId: string, program: string, temperature: number): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) return;
        this.saving.set(`${circuitId}-${program}`);
        this.api.executeCommand(
            ctx.installationId, ctx.gatewaySerial, ctx.deviceId,
            `heating.circuits.${circuitId}.operating.programs.${program}`, 'setTemperature',
            { targetTemperature: temperature }
        ).subscribe({
            next: () => { this.snackBar.open(`${program} temperature saved.`, 'OK', { duration: 3000 }); this.saving.set(null); this.load(); },
            error: (e) => { this.snackBar.open(`Error: ${e?.error?.message ?? 'Command failed'}`, 'Dismiss', { duration: 5000 }); this.saving.set(null); },
        });
    }

    getCircuit(circuits: CircuitInfo[], id: string): CircuitInfo | undefined {
        return circuits.find((c) => c.id === id);
    }

    getProgram(circuit: CircuitInfo, name: string) {
        return circuit.programs.find((p) => p.name === name) ?? null;
    }
}
