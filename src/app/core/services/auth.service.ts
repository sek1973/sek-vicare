import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
}

const KEYS = {
    ACCESS_TOKEN: 'vicare_access_token',
    REFRESH_TOKEN: 'vicare_refresh_token',
    TOKEN_EXPIRY: 'vicare_token_expiry',
    CODE_VERIFIER: 'vicare_code_verifier',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    readonly isAuthenticated$ = new BehaviorSubject<boolean>(this.hasValidToken());

    get accessToken(): string | null {
        if (this.hasValidToken()) {
            return localStorage.getItem(KEYS.ACCESS_TOKEN);
        }
        return null;
    }

    private hasValidToken(): boolean {
        const token = localStorage.getItem(KEYS.ACCESS_TOKEN);
        const expiry = localStorage.getItem(KEYS.TOKEN_EXPIRY);
        if (!token || !expiry) return false;
        return Date.now() < parseInt(expiry, 10);
    }

    async initiateLogin(): Promise<void> {
        const verifier = this.generateCodeVerifier();
        const challenge = await this.generateCodeChallenge(verifier);
        sessionStorage.setItem(KEYS.CODE_VERIFIER, verifier);

        const params = new URLSearchParams({
            client_id: environment.clientId,
            redirect_uri: environment.redirectUri,
            response_type: 'code',
            scope: environment.scope,
            code_challenge: challenge,
            code_challenge_method: 'S256',
        });

        window.location.href = `${environment.authUrl}?${params.toString()}`;
    }

    async handleCallback(code: string): Promise<void> {
        const verifier = sessionStorage.getItem(KEYS.CODE_VERIFIER);
        if (!verifier) throw new Error('Missing PKCE code verifier — please restart the login flow.');

        const body = new HttpParams()
            .set('grant_type', 'authorization_code')
            .set('client_id', environment.clientId)
            .set('redirect_uri', environment.redirectUri)
            .set('code', code)
            .set('code_verifier', verifier);

        const response = await firstValueFrom(
            this.http
                .post<TokenResponse>(environment.tokenUrl, body.toString(), {
                    headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
                })
                .pipe(timeout(15_000)),
        );

        this.storeTokens(response);
        sessionStorage.removeItem(KEYS.CODE_VERIFIER);
        this.isAuthenticated$.next(true);
    }

    async refreshAccessToken(): Promise<void> {
        const refreshToken = localStorage.getItem(KEYS.REFRESH_TOKEN);
        if (!refreshToken) throw new Error('No refresh token — please log in again.');

        const body = new HttpParams()
            .set('grant_type', 'refresh_token')
            .set('client_id', environment.clientId)
            .set('refresh_token', refreshToken);

        const response = await firstValueFrom(
            this.http
                .post<TokenResponse>(environment.tokenUrl, body.toString(), {
                    headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
                })
                .pipe(timeout(15_000)),
        );

        this.storeTokens(response);
    }

    logout(): void {
        localStorage.removeItem(KEYS.ACCESS_TOKEN);
        localStorage.removeItem(KEYS.REFRESH_TOKEN);
        localStorage.removeItem(KEYS.TOKEN_EXPIRY);
        this.isAuthenticated$.next(false);
        this.router.navigate(['/login']);
    }

    private storeTokens(response: TokenResponse): void {
        localStorage.setItem(KEYS.ACCESS_TOKEN, response.access_token);
        if (response.refresh_token) {
            localStorage.setItem(KEYS.REFRESH_TOKEN, response.refresh_token);
        }
        // Subtract 60 s to refresh before expiry
        const expiry = Date.now() + (response.expires_in - 60) * 1000;
        localStorage.setItem(KEYS.TOKEN_EXPIRY, expiry.toString());
    }

    // ─── PKCE helpers ─────────────────────────────────────────────────────────

    private generateCodeVerifier(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.base64UrlEncode(array);
    }

    private async generateCodeChallenge(verifier: string): Promise<string> {
        const data = new TextEncoder().encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return this.base64UrlEncode(new Uint8Array(digest));
    }

    private base64UrlEncode(bytes: Uint8Array): string {
        return btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}
