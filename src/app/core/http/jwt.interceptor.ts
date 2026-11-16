import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { API_BASE_URL } from '../config/api-endpoints';

const PREFIXO_SURFACE = `${API_BASE_URL}/api/v1/`;

/** True para rotas `/api/v1/` da Surface que exigem o token (excluindo `/api/auth/login`, `/auth/cliente` e origens externas). */
export function exigeToken(url: string): boolean {
  return url.startsWith(PREFIXO_SURFACE);
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(STORAGE_TOKEN);
  const token = storage.getItem('autoreparos_token');
  if (token && exigeToken(req.url) && !req.headers.has('Authorization')) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }
  return next(req);
};
