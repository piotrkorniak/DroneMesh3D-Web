import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <h1>DroneMesh3D</h1>
      <p>Sign in to continue</p>
      <a [href]="loginUrl" class="google-btn" aria-label="Sign in with Google"> Sign in with Google </a>
    </div>
  `,
  styles: `
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 1rem;
    }
    .google-btn {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 4px;
      background: #4285f4;
      color: white;
      cursor: pointer;
      text-decoration: none;
    }
    .google-btn:hover {
      background: #357ae8;
    }
  `,
})
export class LoginComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly loginUrl = `${environment.apiUrl}/api/auth/google?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/' : '/')}`;

  ngOnInit(): void {
    console.log('[LOGIN] LoginComponent initialized, loginUrl:', this.loginUrl);
  }
}
