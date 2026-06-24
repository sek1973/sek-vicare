import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'callback',
        loadComponent: () =>
            import('./features/callback/callback.component').then((m) => m.CallbackComponent),
    },
    {
        path: '',
        loadComponent: () =>
            import('./features/shell/shell.component').then((m) => m.ShellComponent),
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            },
            {
                path: 'thermostats',
                loadComponent: () =>
                    import('./features/thermostats/thermostats.component').then((m) => m.ThermostatsComponent),
            },
            {
                path: 'statistics',
                loadComponent: () =>
                    import('./features/statistics/statistics.component').then((m) => m.StatisticsComponent),
            },
            {
                path: 'settings',
                loadComponent: () =>
                    import('./features/settings/settings.component').then((m) => m.SettingsComponent),
            },
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
