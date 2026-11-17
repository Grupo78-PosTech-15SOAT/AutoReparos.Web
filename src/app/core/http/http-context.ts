import { HttpContextToken } from '@angular/common/http';

/** Status HTTP que o chamador trata na própria tela; o `errorInterceptor` não mostra toast para eles. */
export const STATUS_TRATADOS_NA_TELA = new HttpContextToken<readonly number[]>(() => []);
