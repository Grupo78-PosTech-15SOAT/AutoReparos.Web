import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { STATUS_TRATADOS_NA_TELA } from '../../../core/http/http-context';
import { FiltroSagas, RetentativaResposta, SagaDetalhe, SagaResumo } from '../models/saga.model';

@Injectable({
  providedIn: 'root',
})
export class SagaService {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroSagas = {}): Observable<SagaResumo[]> {
    let params = new HttpParams();
    if (filtro.estado) {
      params = params.set('estado', filtro.estado);
    }
    if (filtro.paradaHaMinutos !== undefined && filtro.paradaHaMinutos !== null && filtro.paradaHaMinutos > 0) {
      params = params.set('paradaHaMinutos', String(filtro.paradaHaMinutos));
    }
    return this.http
      .get<SagaResumo[] | { itens: SagaResumo[] }>(API_ENDPOINTS.SAGAS.BASE, { params })
      .pipe(map(res => (Array.isArray(res) ? res : res?.itens ?? [])));
  }

  obter(ordemServicoId: string): Observable<SagaDetalhe> {
    return this.http.get<SagaDetalhe>(API_ENDPOINTS.SAGAS.BY_ID(ordemServicoId)).pipe(
      map(d => ({
        ...d,
        etapas: d.etapas ?? [],
        comandos: d.comandos ?? [],
        registros: d.registros ?? [],
      }))
    );
  }

  retentar(ordemServicoId: string, motivo: string): Observable<RetentativaResposta> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<RetentativaResposta>(
      API_ENDPOINTS.SAGAS.RETENTAR(ordemServicoId),
      { motivo },
      { context }
    );
  }
}
