import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DeviceContext } from '../models/vicare.models';

const STORAGE_KEY = 'vicare_device_context';

@Injectable({ providedIn: 'root' })
export class DeviceContextService {
    private readonly _context$ = new BehaviorSubject<DeviceContext | null>(
        this.loadFromStorage(),
    );
    readonly context$ = this._context$.asObservable();

    get context(): DeviceContext | null {
        return this._context$.value;
    }

    setContext(ctx: DeviceContext): void {
        this._context$.next(ctx);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    }

    clear(): void {
        this._context$.next(null);
        localStorage.removeItem(STORAGE_KEY);
    }

    private loadFromStorage(): DeviceContext | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as DeviceContext) : null;
        } catch {
            return null;
        }
    }
}
