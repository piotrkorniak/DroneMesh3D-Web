import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-container">
      <h1>DroneMesh3D</h1>
      <p>Zaloguj się, aby kontynuować</p>
      <button (click)="auth.login()" class="google-btn">Zaloguj przez Google</button>
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
    }
    .google-btn:hover {
      background: #357ae8;
    }
  `,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
}
