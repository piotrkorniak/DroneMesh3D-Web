import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);

  checkAuth(): void {
    console.log('[AUTH] checkAuth() called, hitting /api/auth/me');
    this.http.get<User>('/api/auth/me').subscribe({
      next: (user) => {
        console.log('[AUTH] checkAuth() success, user:', user);
        this.user.set(user);
        this.loading.set(false);
      },
      error: (err) => {
        console.log('[AUTH] checkAuth() failed, status:', err.status);
        this.user.set(null);
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    console.log('[AUTH] logout() called');
    this.user.set(null);
    this.http.post('/api/auth/logout', null).subscribe();
  }

  login(): void {
    const returnUrl = encodeURIComponent(window.location.origin + '/');
    const url = `${environment.apiUrl}/api/auth/google?returnUrl=${returnUrl}`;
    console.log('[AUTH] login() called, redirecting to:', url);
    window.location.href = url;
  }
}
