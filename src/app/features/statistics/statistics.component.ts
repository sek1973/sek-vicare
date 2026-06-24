import {
    Component,
    inject,
    OnInit,
    OnDestroy,
    signal,
    ElementRef,
    ViewChild,
    AfterViewInit,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { StatisticsService } from '../../core/services/statistics.service';
import { DeviceContextService } from '../../core/services/device-context.service';
import { TemperatureReading } from '../../core/models/vicare.models';

Chart.register(...registerables);

type TimeRange = '1h' | '6h' | '24h' | '7d';

const COLORS = [
    '#1976d2', '#e53935', '#43a047', '#fb8c00',
    '#8e24aa', '#00acc1', '#6d4c41', '#546e7a',
];

const FEATURE_LABELS: Record<string, string> = {
    'heating.boiler.sensors.temperature.main': 'Boiler',
    'heating.device.sensors.temperature.outside': 'Outside',
    'heating.dhw.sensors.temperature.hotWaterStorage': 'Hot Water',
};

@Component({
    selector: 'app-statistics',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatSelectModule,
        MatFormFieldModule,
        MatButtonToggleModule,
        FormsModule,
    ],
    templateUrl: './statistics.component.html',
    styleUrl: './statistics.component.scss',
})
export class StatisticsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    private readonly stats = inject(StatisticsService);
    private readonly deviceCtx = inject(DeviceContextService);

    readonly readingCount = signal(0);
    readonly sensorNames = signal<string[]>([]);
    selectedRange: TimeRange = '24h';

    private chart: Chart | null = null;
    private sub?: Subscription;

    ngOnInit(): void {
        const ctx = this.deviceCtx.context;
        if (ctx) this.stats.startPolling(ctx);
    }

    ngAfterViewInit(): void {
        this.initChart();
        this.sub = this.stats.readings$.subscribe((readings) => {
            this.readingCount.set(readings.length);
            this.sensorNames.set(this.stats.getSensorNames());
            this.updateChart(readings);
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
        this.chart?.destroy();
    }

    onRangeChange(): void {
        this.updateChart(this.getCurrentReadings());
    }

    clearHistory(): void {
        this.stats.clearHistory();
    }

    featureLabel(name: string): string {
        if (FEATURE_LABELS[name]) return FEATURE_LABELS[name];
        const m = name.match(/heating\.zones\.(\w+)\.sensors\.temperature\.room/);
        return m ? `Zone ${m[1]}` : name;
    }

    private getCurrentReadings(): TemperatureReading[] {
        let readings: TemperatureReading[] = [];
        this.stats.readings$.subscribe((r) => (readings = r)).unsubscribe();
        return readings;
    }

    private getCutoff(): number {
        const h = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }[this.selectedRange];
        return Date.now() - h * 60 * 60 * 1000;
    }

    private initChart(): void {
        const config: ChartConfiguration = {
            type: 'line',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        type: 'time',
                        time: { tooltipFormat: 'HH:mm dd/MM', displayFormats: { hour: 'HH:mm', day: 'dd/MM' } },
                        title: { display: true, text: 'Time' },
                    },
                    y: {
                        title: { display: true, text: 'Temperature (°C)' },
                    },
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)} °C` } },
                },
            },
        };
        this.chart = new Chart(this.chartCanvas.nativeElement, config);
    }

    private updateChart(allReadings: TemperatureReading[]): void {
        if (!this.chart) return;
        const cutoff = this.getCutoff();
        const filtered = allReadings.filter((r) => r.timestamp >= cutoff);

        const byFeature = new Map<string, TemperatureReading[]>();
        for (const r of filtered) {
            if (!byFeature.has(r.featureName)) byFeature.set(r.featureName, []);
            byFeature.get(r.featureName)!.push(r);
        }

        this.chart.data.datasets = [...byFeature.entries()].map(([name, readings], i) => ({
            label: this.featureLabel(name),
            data: readings.map((r) => ({ x: r.timestamp, y: r.value })),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: COLORS[i % COLORS.length] + '22',
            tension: 0.3,
            pointRadius: filtered.length < 100 ? 3 : 0,
            fill: false,
        }));

        this.chart.update();
    }
}
