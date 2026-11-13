import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { API_BASE_URL } from '../config/api-endpoints';

const PREFIXO_SURFACE = `${API_BASE_URL}/api/v1/`;
const ROTAS_PUBLICAS = [/^[^?]*\/ordens-servico\/[^/?]+\/consulta(\?|$)/, /^[^?]*\/orcamentos\/publico(\/|\?|$)/];

/** True para rotas `/api/v1` da Surface que exigem o token (as rotas públicas ficam de fora). */
export function exigeToken(url: string): boolean {
  return url.startsWith(PREFIXO_SURFACE) && !ROTAS_PUBLICAS.some(rota => rota.test(url));
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(STORAGE_TOKEN);
  const token = storage.getItem('autoreparos_token');
  if (token && exigeToken(req.url)) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }
  return next(req);
};
