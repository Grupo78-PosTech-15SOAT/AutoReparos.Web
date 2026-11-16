import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { CheckoutResponse, ReembolsoResponse, SolicitarReembolsoRequest } from '../models/pagamento.model';

@Injectable({
  providedIn: 'root'
})
export class PagamentoService {
  private readonly http = inject(HttpClient);

  iniciarCheckout(pagamentoId: string): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(API_ENDPOINTS.PAGAMENTOS.CHECKOUT(pagamentoId), {}).pipe(
      map(res => ({
        ...res,
        urlCheckout: res?.urlCheckout ?? res?.initPoint ?? '',
      }))
    );
  }

  solicitarReembolso(pagamentoId: string, req: SolicitarReembolsoRequest): Observable<ReembolsoResponse> {
    return this.http.post<ReembolsoResponse>(API_ENDPOINTS.PAGAMENTOS.REEMBOLSOS(pagamentoId), req);
  }
}
