import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { DecimalPipe, DatePipe } from '@angular/common';
import { VicareApiService } from '../../core/services/vicare-api.service';
import { DeviceContextService } from '../../core/services/device-context.service';
import { StatisticsService } from '../../core/services/statistics.service';
import { DashboardData } from '../../core/models/vicare.models';

@Component({
    selector: 'app-dashboard',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatDividerModule,
        DecimalPipe,
        DatePipe,
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
    private readonly api = inject(VicareApiService);
    private readonly deviceCtx = inject(DeviceContextService);
    private readonly statistics = inject(StatisticsService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly data = signal<DashboardData | null>(null);
    readonly lastRefresh = signal<Date | null>(null);

    ngOnInit(): void {
        this.load();
        const ctx = this.deviceCtx.context;
        if (ctx) this.statistics.startPolling(ctx);
    }

    load(): void {
        const ctx = this.deviceCtx.context;
        if (!ctx) {
            this.error.set('No device selected. Please log out and sign in again.');
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.api
            .getDashboardData(ctx.installationId, ctx.gatewaySerial, ctx.deviceId)
            .subscribe({
                next: (d) => {
                    this.data.set(d);
                    this.lastRefresh.set(new Date());
                    this.loading.set(false);
                },
                error: (e) => {
                    this.error.set(`Failed to load data: ${e?.message ?? 'Unknown error'}`);
                    this.loading.set(false);
                },
            });
    }
}
