import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { VicareApiService } from '../../core/services/vicare-api.service';
import { DeviceContextService } from '../../core/services/device-context.service';
import { VicareFeature, ZoneInfo } from '../../core/models/vicare.models';

interface ZoneEditing {
    targetTemperature: number;
}

@Component({
    selector: 'app-thermostats',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSliderModule,
        MatSelectModule,
        MatFormFieldModule,
        MatSnackBarModule,
        MatTooltipModule,
        FormsModule,
        DecimalPipe,
    ],
    templateUrl: './thermostats.component.html',
    styleUrl: './thermostats.component.scss',
})
export class ThermostatsComponent implements OnInit {
    private readonly api = inject(VicareApiService);
    private readonly deviceCtx = inject(DeviceContextService);
    private readonly snackBar = inject(MatSnackBar);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly zones = signal<ZoneInfo[]>([]);
    readonly savingZone = signal<string | null>(null);
    readonly rawFeatures = signal<VicareFeature[]>([]);

    /** Per-zone editing state: zoneId → edited values */
    editMap: Record<string, ZoneEditing> = {};

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) {
            this.error.set('No device context — please sign in again.');
            return;
        }
        this.loading.set(true);
        this.error.set(null);

        this.api.getFeatures(ctx.installationId, ctx.gatewaySerial, ctx.deviceId).subscribe({
            next: (features) => {
                this.rawFeatures.set(features);
                const parsed = this.api.parseFeatures(features);
                this.zones.set(parsed.zones);
                // Initialise editing state
                for (const zone of parsed.zones) {
                    if (!(zone.id in this.editMap)) {
                        this.editMap[zone.id] = {
                            targetTemperature: zone.targetTemperature ?? 20,
                        };
                    }
                }
                this.loading.set(false);
            },
            error: (e) => {
                this.error.set(`Failed to load thermostat data: ${e?.message ?? 'Unknown error'}`);
                this.loading.set(false);
            },
        });
    }

    setTargetTemperature(zone: ZoneInfo): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) return;

        const temperature = this.editMap[zone.id]?.targetTemperature;
        if (temperature == null) return;

        this.savingZone.set(zone.id);

        this.api
            .executeCommand(
                ctx.installationId,
                ctx.gatewaySerial,
                ctx.deviceId,
                `heating.zones.${zone.id}.temperature`,
                'setTargetTemperature',
                { targetTemperature: temperature },
            )
            .subscribe({
                next: () => {
                    this.snackBar.open(`Zone ${zone.name}: target set to ${temperature} °C`, 'OK', { duration: 3000 });
                    this.savingZone.set(null);
                    this.load();
                },
                error: (e) => {
                    this.snackBar.open(`Error: ${e?.error?.message ?? e?.message ?? 'Command failed'}`, 'Dismiss', {
                        duration: 5000,
                    });
                    this.savingZone.set(null);
                },
            });
    }

    valveStatusLabel(zone: ZoneInfo): string {
        if (zone.valveOpen === null) return 'Unknown';
        return zone.valveOpen ? 'Open — heating' : 'Closed — idle';
    }

    valveIcon(zone: ZoneInfo): string {
        if (zone.valveOpen === null) return 'help_outline';
        return zone.valveOpen ? 'whatshot' : 'ac_unit';
    }
}
