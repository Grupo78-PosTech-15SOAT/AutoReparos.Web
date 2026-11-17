import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Servico, normalizarServico } from '../models/servico.model';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { PagedResult } from '../../../shared/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class ServicoService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Servico[]> {
    return this.http.get<unknown>(API_ENDPOINTS.SERVICOS.BASE).pipe(
      map(res => this.extrairItens(res).map(normalizarServico))
    );
  }

  getAll(pageNumber = 1, pageSize = 10): Observable<PagedResult<Servico>> {
    return this.listar().pipe(
      map(items => ({
        items,
        total: items.length,
        pageNumber,
        pageSize,
        totalPages: Math.max(1, Math.ceil(items.length / (pageSize || 1)))
      }))
    );
  }

  criar(servico: Partial<Servico>): Observable<Servico> {
    const precoUnitario = Number(servico.precoUnitario ?? servico.precoBase ?? servico.valorTabelado ?? 0);
    const desc = servico.descricao?.trim();
    const payload: Record<string, unknown> = {
      nome: servico.nome ?? '',
      precoUnitario,
      precoBase: precoUnitario,
      valorTabelado: precoUnitario,
    };
    if (desc) {
      payload['descricao'] = desc;
    }
    return this.http.post<Servico>(API_ENDPOINTS.SERVICOS.BASE, payload).pipe(
      map(res => normalizarServico(res ?? payload))
    );
  }

  private extrairItens(res: unknown): Partial<Servico>[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      if (Array.isArray(obj['itens'])) return obj['itens'] as Partial<Servico>[];
      if (Array.isArray(obj['items'])) return obj['items'] as Partial<Servico>[];
      if (Array.isArray(obj['dados'])) return obj['dados'] as Partial<Servico>[];
    }
    return [];
  }
}
