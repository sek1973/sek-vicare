import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-login',
    imports: [MatButtonModule, MatCardModule, MatIconModule],
    template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="logo">
            <mat-icon>thermostat</mat-icon>
          </div>
          <mat-card-title>ViCare Monitor</mat-card-title>
          <mat-card-subtitle>Viessmann Heating System Dashboard</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p>
            Monitor room temperatures, burner status, and change settings for your
            Viessmann heating system — all from one place.
          </p>
          @if (missingClientId) {
            <div class="warning">
              <mat-icon>warning</mat-icon>
              <span>
                <strong>Client ID not configured.</strong>
                Open <code>src/environments/environment.ts</code> and replace
                <code>YOUR_CLIENT_ID</code> with your ID from the
                <a href="https://app.developer.viessmann.com" target="_blank" rel="noopener">
                  Viessmann Developer Portal
                </a>.
              </span>
            </div>
          }
        </mat-card-content>

        <mat-card-actions align="end">
          <button
            mat-raised-button
            color="primary"
            [disabled]="missingClientId"
            (click)="login()"
          >
            <mat-icon>login</mat-icon>
            Sign in with ViCare
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
    styles: `
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
    }
    .login-card {
      width: 420px;
      max-width: 95vw;
      padding: 16px;
    }
    .logo {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #1976d2;
      }
    }
    mat-card-header { flex-direction: column; align-items: center; }
    mat-card-title { font-size: 1.6rem; margin-top: 8px; }
    .warning {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: #fff3e0;
      border: 1px solid #fb8c00;
      border-radius: 4px;
      padding: 12px;
      margin-top: 16px;
      font-size: 0.9rem;
      mat-icon { color: #fb8c00; flex-shrink: 0; }
    }
    code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 0.85em; }
  `,
})
export class LoginComponent {
    private readonly auth = inject(AuthService);
    readonly missingClientId = environment.clientId === 'YOUR_CLIENT_ID';

    async login(): Promise<void> {
        await this.auth.initiateLogin();
    }
}
