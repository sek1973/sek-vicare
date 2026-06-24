import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
    VicareFeature,
    VicareInstallation,
    CircuitInfo,
    DashboardData,
    ProgramInfo,
    ZoneInfo,
} from '../models/vicare.models';

@Injectable({ providedIn: 'root' })
export class VicareApiService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);

    // ─── Raw API calls ─────────────────────────────────────────────────────────

    getInstallations(): Observable<VicareInstallation[]> {
        return this.withAuth(() =>
            this.http
                .get<{ data: VicareInstallation[] }>(
                    `${environment.apiBase}/equipment/installations?includeGateways=true`,
                    { headers: this.headers() },
                )
                .pipe(map((r) => r.data)),
        );
    }

    getFeatures(
        installationId: number,
        gatewaySerial: string,
        deviceId: string,
    ): Observable<VicareFeature[]> {
        return this.withAuth(() =>
            this.http
                .get<{ data: VicareFeature[] }>(
                    `${environment.apiBase}/features/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features`,
                    { headers: this.headers() },
                )
                .pipe(map((r) => r.data)),
        );
    }

    executeCommand(
        installationId: number,
        gatewaySerial: string,
        deviceId: string,
        feature: string,
        command: string,
        params: Record<string, unknown>,
    ): Observable<void> {
        return this.withAuth(() =>
            this.http.post<void>(
                `${environment.apiBase}/features/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features/${feature}/commands/${command}`,
                params,
                { headers: this.headers() },
            ),
        );
    }

    // ─── Parsed helpers ────────────────────────────────────────────────────────

    getDashboardData(
        installationId: number,
        gatewaySerial: string,
        deviceId: string,
    ): Observable<DashboardData> {
        return this.getFeatures(installationId, gatewaySerial, deviceId).pipe(
            map((features) => this.parseFeatures(features)),
        );
    }

    // ─── Feature parser ────────────────────────────────────────────────────────

    parseFeatures(features: VicareFeature[]): DashboardData {
        const byName = new Map(features.map((f) => [f.feature, f]));

        const numVal = (name: string, prop = 'value'): number | null => {
            const f = byName.get(name);
            if (!f?.isEnabled || !f.properties?.[prop]) return null;
            const v = f.properties[prop].value;
            return typeof v === 'number' ? v : null;
        };

        const strVal = (name: string, prop = 'value'): string | null => {
            const f = byName.get(name);
            if (!f?.isEnabled || !f.properties?.[prop]) return null;
            const v = f.properties[prop].value;
            return typeof v === 'string' ? v : null;
        };

        const boolVal = (name: string, prop = 'active'): boolean | null => {
            const f = byName.get(name);
            if (!f?.isEnabled || !f.properties?.[prop]) return null;
            const v = f.properties[prop].value;
            return typeof v === 'boolean' ? v : null;
        };

        const constraints = (name: string, cmd: string, param: string) => {
            const f = byName.get(name);
            const c = f?.commands?.[cmd]?.params?.[param]?.constraints;
            if (!c) return null;
            return {
                min: c.minValue ?? 0,
                max: c.maxValue ?? 100,
                step: c.stepping ?? 1,
            };
        };

        // ── Zones (radio thermostats) ────────────────────────────────────────────
        const zoneIds = [
            ...new Set(
                features
                    .map((f) => f.feature.match(/^heating\.zones\.(\w+)\./)?.[1])
                    .filter((id): id is string => id != null),
            ),
        ];

        const zones: ZoneInfo[] = zoneIds.map((id) => {
            const base = `heating.zones.${id}`;
            const valveFeature = byName.get(`${base}.valve.position`);
            const valvePos = valveFeature?.properties?.['value']?.value;

            return {
                id,
                name: strVal(`${base}.name`) ?? `Zone ${id}`,
                roomTemperature: numVal(`${base}.sensors.temperature.room`),
                targetTemperature: numVal(`${base}.temperature`, 'value') ??
                    numVal(`${base}.desiredTemperature`),
                activeMode: strVal(`${base}.mode.active`),
                valveOpen: typeof valvePos === 'string' ? valvePos === 'open' : null,
                temperatureConstraints: constraints(`${base}.temperature`, 'setTargetTemperature', 'targetTemperature'),
            };
        });

        // ── Circuits ─────────────────────────────────────────────────────────────
        const circuitIds = [
            ...new Set(
                features
                    .map((f) => f.feature.match(/^heating\.circuits\.(\w+)\./)?.[1])
                    .filter((id): id is string => id != null),
            ),
        ];

        const circuits: CircuitInfo[] = circuitIds.map((id) => {
            const base = `heating.circuits.${id}`;
            const modesFeature = byName.get(`${base}.operating.modes.active`);
            const availableModes: string[] =
                (modesFeature?.properties?.['value']?.value as string[] | undefined) ?? [];

            const programNames = ['comfort', 'eco', 'normal', 'reduced', 'standby', 'forcedNormal', 'forcedReduced', 'external'];
            const programs: ProgramInfo[] = programNames
                .map((prog) => {
                    const pf = byName.get(`${base}.operating.programs.${prog}`);
                    if (!pf?.isEnabled) return null;
                    const temp = numVal(`${base}.operating.programs.${prog}`, 'temperature');
                    const active = strVal(`${base}.operating.programs.active`) === prog;
                    return {
                        name: prog,
                        temperature: temp,
                        isActive: active,
                        constraints: constraints(
                            `${base}.operating.programs.${prog}`,
                            'setTemperature',
                            'targetTemperature',
                        ),
                    } as ProgramInfo;
                })
                .filter((p): p is ProgramInfo => p != null);

            return {
                id,
                operatingMode: strVal(`${base}.operating.modes.active`),
                activeProgram: strVal(`${base}.operating.programs.active`),
                supplyTemperature: numVal(`${base}.sensors.temperature.supply`),
                programs,
                availableModes,
            };
        });

        // ── DHW constraints ───────────────────────────────────────────────────────
        const dhwTargetConstraints = constraints(
            'heating.dhw.temperature.main',
            'setTargetTemperature',
            'temperature',
        );

        return {
            boilerTemperature:
                numVal('heating.boiler.sensors.temperature.main') ??
                numVal('heating.boiler.temperature'),
            outsideTemperature: numVal('heating.device.sensors.temperature.outside'),
            dhwStorageTemperature: numVal('heating.dhw.sensors.temperature.hotWaterStorage'),
            dhwTargetTemperature: numVal('heating.dhw.temperature.main'),
            dhwTargetConstraints,
            burnerActive: boolVal('heating.burners.0', 'active') ?? false,
            burnerModulation: numVal('heating.burners.0.statistics', 'modulation'),
            burnerHours: numVal('heating.burners.0.statistics', 'hours'),
            circuits,
            zones,
        };
    }

    // ─── Auth wiring ───────────────────────────────────────────────────────────

    private withAuth<T>(request: () => Observable<T>): Observable<T> {
        if (this.auth.accessToken) return request();
        return from(this.auth.refreshAccessToken()).pipe(
            switchMap(() => request()),
            catchError((err) => {
                this.auth.logout();
                return throwError(() => err);
            }),
        );
    }

    private headers(): HttpHeaders {
        return new HttpHeaders({
            Authorization: `Bearer ${this.auth.accessToken}`,
            'Content-Type': 'application/json',
        });
    }
}
