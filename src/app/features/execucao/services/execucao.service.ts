import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { STATUS_TRATADOS_NA_TELA } from '../../../core/http/http-context';
import { FiltroFilaExecucao, ItemFilaExecucao, TipoEtapaExecucao } from '../models/execucao.model';

@Injectable({
  providedIn: 'root'
})
export class ExecucaoService {
  private readonly http = inject(HttpClient);

  listarFila(filtro: FiltroFilaExecucao = {}): Observable<ItemFilaExecucao[]> {
    let params = new HttpParams();
    if (filtro.status?.trim()) {
      params = params.set('status', filtro.status.trim());
    }
    if (filtro.mecanicoId?.trim()) {
      params = params.set('mecanicoId', filtro.mecanicoId.trim());
    }

    return this.http.get<unknown>(API_ENDPOINTS.EXECUCAO.FILA, { params }).pipe(
      map(res => this.extrairItens(res))
    );
  }

  registrarEtapa(execucaoId: string, etapa: TipoEtapaExecucao, descricao?: string): Observable<ItemFilaExecucao> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<ItemFilaExecucao>(
      API_ENDPOINTS.EXECUCAO.ETAPAS(execucaoId),
      { etapa, tipo: etapa, ...(descricao ? { descricao } : {}) },
      { context }
    );
  }

  concluir(execucaoId: string): Observable<ItemFilaExecucao> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<ItemFilaExecucao>(
      API_ENDPOINTS.EXECUCAO.CONCLUSAO(execucaoId),
      {},
      { context }
    );
  }

  marcarFalha(execucaoId: string, motivo: string): Observable<ItemFilaExecucao> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<ItemFilaExecucao>(
      API_ENDPOINTS.EXECUCAO.FALHA(execucaoId),
      { motivo },
      { context }
    );
  }

  reexecutar(execucaoId: string, motivo: string): Observable<ItemFilaExecucao> {
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [409, 422]);
    return this.http.post<ItemFilaExecucao>(
      API_ENDPOINTS.EXECUCAO.REEXECUCAO(execucaoId),
      { motivo },
      { context }
    );
  }

  private extrairItens(res: unknown): ItemFilaExecucao[] {
    if (Array.isArray(res)) {
      return res as ItemFilaExecucao[];
    }
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      const lista = obj['itens'] ?? obj['Itens'] ?? obj['items'] ?? obj['Items'] ?? obj['data'];
      if (Array.isArray(lista)) {
        return lista as ItemFilaExecucao[];
      }
    }
    return [];
  }
}
