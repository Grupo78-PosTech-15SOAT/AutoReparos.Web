import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import {
  CancelamentoResposta,
  CriarOSRequest,
  ExecucaoResumo,
  FiltroOs,
  OrcamentoResumo,
  OsConsulta,
  OsDetalhe,
  OsPagina,
  OsResumo
} from '../models/ordem-servico.model';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { STATUS_TRATADOS_NA_TELA } from '../../../core/http/http-context';

@Injectable({
  providedIn: 'root'
})
export class OrdemServicoService {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroOs = {}): Observable<OsPagina> {
    let params = new HttpParams();
    if (filtro.status) params = params.set('status', filtro.status);
    if (filtro.pagina) params = params.set('pagina', filtro.pagina.toString());
    if (filtro.tamanho) params = params.set('tamanho', filtro.tamanho.toString());
    return this.http.get<OsPagina>(API_ENDPOINTS.ORDENS_SERVICO.BASE, { params });
  }

  obter(id: string): Observable<OsDetalhe> {
    return this.http.get<OsDetalhe>(API_ENDPOINTS.ORDENS_SERVICO.BY_ID(encodeURIComponent(id))).pipe(
      map(os => ({ ...os, historico: os.historico ?? [] }))
    );
  }

  /** O 422 do formulário é tratado pela tela (sem toast). */
  criar(req: CriarOSRequest): Observable<OsResumo> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [422]);
    return this.http.post<OsResumo>(API_ENDPOINTS.ORDENS_SERVICO.BASE, req, { context });
  }

  /** 409 `saga_em_andamento` e `cancelamento_indisponivel` são mostrados pelo componente de cancelamento. */
  cancelar(id: string, motivo: string): Observable<CancelamentoResposta> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<CancelamentoResposta>(API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO(id), { motivo }, { context });
  }

  consultar(id: string): Observable<OsConsulta> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [404]);
    return this.http.get<OsConsulta>(API_ENDPOINTS.ORDENS_SERVICO.CONSULTA(encodeURIComponent(id)), { context }).pipe(
      map(os => ({ ...os, historico: os.historico ?? [] }))
    );
  }

  /** `null` quando a OS ainda não tem orçamento (404). */
  obterOrcamento(ordemServicoId: string): Observable<OrcamentoResumo | null> {
    const params = new HttpParams().set('ordemServicoId', ordemServicoId);
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [404]);
    return this.http.get<OrcamentoResumo>(API_ENDPOINTS.ORCAMENTOS.BASE, { params, context }).pipe(
      map(o => ({ ...o, itens: o.itens ?? [] })),
      catchError(err => (err?.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  /** Estado da execução da OS na fila de execução; `null` quando não há execução. */
  obterExecucao(ordemServicoId: string): Observable<ExecucaoResumo | null> {
    const params = new HttpParams().set('ordemServicoId', ordemServicoId);
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [404]);
    return this.http.get<ExecucaoResumo[] | { itens: ExecucaoResumo[] }>(API_ENDPOINTS.EXECUCAO.FILA, { params, context }).pipe(
      map(res => (Array.isArray(res) ? res : res?.itens ?? [])),
      map(lista => lista.find(e => !e.ordemServicoId || e.ordemServicoId === ordemServicoId) ?? null),
      catchError(err => (err?.status === 404 ? of(null) : throwError(() => err)))
    );
  }
}
