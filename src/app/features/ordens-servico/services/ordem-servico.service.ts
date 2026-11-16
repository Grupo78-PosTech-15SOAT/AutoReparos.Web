import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import {
  CancelamentoResposta,
  CriarOSRequest,
  ExecucaoResumo,
  OsDetalhe,
  OsResumo,
  SagaAdminResumo,
} from '../models/ordem-servico.model';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { STATUS_TRATADOS_NA_TELA } from '../../../core/http/http-context';

@Injectable({
  providedIn: 'root',
})
export class OrdemServicoService {
  private readonly http = inject(HttpClient);

  /** O 422 do formulário é tratado pela tela (sem toast). */
  criar(req: CriarOSRequest): Observable<OsResumo> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [422]);
    return this.http.post<OsResumo>(API_ENDPOINTS.ORDENS_SERVICO.BASE, req, { context });
  }

  /** Consulta da OS por ID; 404 é tratado pela tela (detalhe, busca rápida e consulta por código). */
  obter(id: string): Observable<OsDetalhe> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [404]);
    return this.http.get<OsDetalhe>(API_ENDPOINTS.ORDENS_SERVICO.BY_ID(encodeURIComponent(id)), { context }).pipe(
      map(os => ({
        ...os,
        historico: (os.historico ?? []).map(h => ({
          ...h,
          em: h.em ?? h.registradoEm ?? '',
        })),
      }))
    );
  }

  /** Atualiza a observação da OS (`PATCH /api/v1/ordens-servico/{id}`). */
  atualizarObservacao(id: string, observacao: string | null): Observable<OsResumo> {
    return this.http.patch<OsResumo>(API_ENDPOINTS.ORDENS_SERVICO.BY_ID(encodeURIComponent(id)), { observacao });
  }

  /** 409 `saga_em_andamento` e `cancelamento_indisponivel` são mostrados pelo componente de cancelamento. */
  cancelar(id: string, motivo: string): Observable<CancelamentoResposta> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<CancelamentoResposta>(
      API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO(encodeURIComponent(id)),
      { motivo },
      { context }
    );
  }

  /** Estado da execução da OS na fila de execução; `null` quando não há execução. */
  obterExecucao(ordemServicoId: string): Observable<ExecucaoResumo | null> {
    const params = new HttpParams().set('ordemServicoId', ordemServicoId);
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [403, 404]);
    return this.http
      .get<ExecucaoResumo[] | { itens: ExecucaoResumo[] }>(API_ENDPOINTS.EXECUCAO.FILA, { params, context })
      .pipe(
        map(res => (Array.isArray(res) ? res : res?.itens ?? [])),
        map(lista => lista.find(e => !e.ordemServicoId || e.ordemServicoId === ordemServicoId) ?? null),
        catchError(err => (err?.status === 404 ? of(null) : throwError(() => err)))
      );
  }

  /** Lista os itens da fila de execução (`GET /api/v1/fila-execucao`). */
  listarFilaExecucao(): Observable<ExecucaoResumo[]> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [403]);
    return this.http
      .get<ExecucaoResumo[] | { itens: ExecucaoResumo[] }>(API_ENDPOINTS.EXECUCAO.FILA, { context })
      .pipe(map(res => (Array.isArray(res) ? res : res?.itens ?? [])));
  }

  /** Lista as Sagas para o Administrador (`GET /api/v1/admin/sagas`). */
  listarSagasAdmin(): Observable<SagaAdminResumo[]> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [403]);
    return this.http
      .get<SagaAdminResumo[] | { itens: SagaAdminResumo[] }>(API_ENDPOINTS.SAGAS.BASE, { context })
      .pipe(map(res => (Array.isArray(res) ? res : res?.itens ?? [])));
  }
}
