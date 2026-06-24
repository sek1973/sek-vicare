import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { TemperatureReading, DeviceContext } from '../models/vicare.models';
import { VicareApiService } from './vicare-api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'vicare_statistics';
const MAX_READINGS = 2000; // ~7 days at 5-min intervals for 3 sensors

/** Features polled for statistics */
const STAT_FEATURES = [
    'heating.boiler.sensors.temperature.main',
    'heating.device.sensors.temperature.outside',
    'heating.dhw.sensors.temperature.hotWaterStorage',
];

@Injectable({ providedIn: 'root' })
export class StatisticsService implements OnDestroy {
    private readonly api = inject(VicareApiService);
    private readonly auth = inject(AuthService);

    private readonly _readings$ = new BehaviorSubject<TemperatureReading[]>(
        this.loadFromStorage(),
    );
    readonly readings$ = this._readings$.asObservable();

    private pollingSubscription?: Subscription;

    startPolling(ctx: DeviceContext): void {
        this.pollingSubscription?.unsubscribe();
        this.pollingSubscription = interval(environment.pollingIntervalMs)
            .pipe(
                filter(() => !!this.auth.accessToken),
                switchMap(() =>
                    this.api.getFeatures(ctx.installationId, ctx.gatewaySerial, ctx.deviceId),
                ),
            )
            .subscribe((features) => {
                const now = Date.now();
                const newReadings: TemperatureReading[] = [];

                for (const f of features) {
                    if (!f.isEnabled) continue;
                    const isStatFeature = STAT_FEATURES.includes(f.feature);
                    const isZoneTemp =
                        /^heating\.zones\.\w+\.sensors\.temperature\.room$/.test(f.feature);

                    if ((isStatFeature || isZoneTemp) && f.properties?.['value']) {
                        const val = f.properties['value'].value;
                        if (typeof val === 'number') {
                            newReadings.push({ timestamp: now, featureName: f.feature, value: val });
                        }
                    }
                }

                const all = [...this._readings$.value, ...newReadings].slice(-MAX_READINGS);
                this._readings$.next(all);
                this.saveToStorage(all);
            });
    }

    stopPolling(): void {
        this.pollingSubscription?.unsubscribe();
    }

    clearHistory(): void {
        this._readings$.next([]);
        localStorage.removeItem(STORAGE_KEY);
    }

    /** Return unique sensor names present in history */
    getSensorNames(): string[] {
        return [...new Set(this._readings$.value.map((r) => r.featureName))];
    }

    private loadFromStorage(): TemperatureReading[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as TemperatureReading[]) : [];
        } catch {
            return [];
        }
    }

    private saveToStorage(readings: TemperatureReading[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
        } catch {
            // Storage quota exceeded — drop oldest quarter
            const trimmed = readings.slice(readings.length / 4);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        }
    }

    ngOnDestroy(): void {
        this.pollingSubscription?.unsubscribe();
    }
}
