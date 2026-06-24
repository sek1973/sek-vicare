import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { DeviceContextService } from '../../core/services/device-context.service';
import { VicareApiService } from '../../core/services/vicare-api.service';

@Component({
    selector: 'app-callback',
    imports: [MatProgressSpinnerModule],
    template: `
    <div class="callback-page">
      @if (error) {
        <p class="error">{{ error }}</p>
      } @else {
        <mat-spinner></mat-spinner>
        <p>Completing sign-in…</p>
      }
    </div>
  `,
    styles: `
    .callback-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .error { color: #c62828; font-size: 1rem; text-align: center; padding: 16px; }
  `,
})
export class CallbackComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly api = inject(VicareApiService);
    private readonly ctx = inject(DeviceContextService);
    private readonly router = inject(Router);

    error: string | null = null;

    async ngOnInit(): Promise<void> {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');

        if (errorParam) {
            this.error = `Authentication error: ${errorParam} — ${params.get('error_description') ?? ''}`;
            return;
        }

        if (!code) {
            this.error = 'No authorisation code received. Please try signing in again.';
            return;
        }

        try {
            await this.auth.handleCallback(code);
            await this.autoSelectDevice();
            this.router.navigate(['/dashboard']);
        } catch (err) {
            this.error = `Sign-in failed: ${err instanceof Error ? err.message : String(err)}`;
        }
    }

    /** Pick the first available installation/gateway/device automatically */
    private async autoSelectDevice(): Promise<void> {
        if (this.ctx.context) return; // already set from a previous session

        const installations = await this.api.getInstallations().toPromise();
        const inst = installations?.[0];
        if (!inst) return;

        const gw = inst.gateways?.[0];
        if (!gw) return;

        const dev = gw.devices?.[0];
        if (!dev) return;

        this.ctx.setContext({
            installationId: inst.id,
            gatewaySerial: gw.serial,
            deviceId: dev.id,
            installationDescription: inst.description,
            deviceModel: dev.modelId,
        });
    }
}
