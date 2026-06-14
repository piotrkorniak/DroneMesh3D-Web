import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.startsWith('/api')) {
    const apiReq = req.clone({ url: `${environment.apiUrl}${req.url}`, withCredentials: true });
    return next(apiReq).pipe(
      tap({
        error: (err) => {
          if (err.status === 401 && !req.url.includes('/api/auth/')) {
            auth.login();
          }
        },
      }),
    );
  }
  return next(req);
};
