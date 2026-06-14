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
    this.http.get<User>('/api/auth/me').subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.user.set(null);
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    this.user.set(null);
    this.http.post('/api/auth/logout', null).subscribe();
  }

  login(): void {
    const returnUrl = encodeURIComponent(window.location.origin + '/');
    window.location.href = `${environment.apiUrl}/api/auth/google?returnUrl=${returnUrl}`;
  }
}
