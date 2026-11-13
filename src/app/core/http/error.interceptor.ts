import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../ui/notification.service';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { resolverMensagemErro } from './error-catalog';
import { STATUS_TRATADOS_NA_TELA } from './http-context';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);
  const storage = inject(STORAGE_TOKEN);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.toLowerCase().includes('/auth/login');
      const resolvida = resolverMensagemErro(error.status, error.error?.codigo);

      if (req.context.get(STATUS_TRATADOS_NA_TELA).includes(error.status)) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (isLoginRequest) {
          const message = error.error?.message || 'E-mail ou senha incorretos. Verifique suas credenciais.';
          notificationService.error('Falha no Login', message);
        } else {
          notificationService.warning(resolvida!.titulo, resolvida!.mensagem);
          storage.removeItem('autoreparos_token');
          storage.removeItem('autoreparos_user');
          router.navigate(['/login']);
        }
      } else if (error.status === 400) {
        const message = error.error?.message || error.error?.title || 'Requisição inválida. Verifique os dados.';
        notificationService.error('Erro de Validação (400)', message);
      } else if (resolvida) {
        const notificar = error.status === 404 || error.status === 409 ? notificationService.warning : notificationService.error;
        notificar.call(notificationService, resolvida.titulo, resolvida.mensagem);
      } else if (error.status === 0 || error.status >= 500) {
        notificationService.error('Erro de Servidor / Conexão', 'Não foi possível se comunicar com o backend.');
      }

      return throwError(() => error);
    })
  );
};
