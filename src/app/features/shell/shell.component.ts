import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { DeviceContextService } from '../../core/services/device-context.service';

interface NavItem {
    path: string;
    label: string;
    icon: string;
}

@Component({
    selector: 'app-shell',
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
    ],
    templateUrl: './shell.component.html',
    styleUrl: './shell.component.scss',
})
export class ShellComponent {
    private readonly auth = inject(AuthService);
    readonly ctx = inject(DeviceContextService);

    readonly navItems: NavItem[] = [
        { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { path: '/thermostats', label: 'Thermostats', icon: 'device_thermostat' },
        { path: '/statistics', label: 'Statistics', icon: 'show_chart' },
        { path: '/settings', label: 'Settings', icon: 'tune' },
    ];

    logout(): void {
        this.auth.logout();
    }
}
