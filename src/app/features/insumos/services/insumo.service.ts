import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Insumo, RegistrarEntradaInsumoRequest, normalizarInsumo } from '../models/insumo.model';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { PagedResult } from '../../../shared/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class InsumoService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Insumo[]> {
    return this.http.get<unknown>(API_ENDPOINTS.INSUMOS.BASE).pipe(
      map(res => this.extrairItens(res).map(normalizarInsumo))
    );
  }

  getAll(pageNumber = 1, pageSize = 10): Observable<PagedResult<Insumo>> {
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

  criar(insumo: Partial<Insumo>): Observable<Insumo> {
    const precoUnitario = Number(insumo.precoUnitario ?? insumo.valor ?? 0);
    const saldoDisponivel = Number(insumo.saldoDisponivel ?? insumo.quantidadeEstoque ?? 0);
    const payload = {
      nome: insumo.nome ?? '',
      descricao: insumo.descricao,
      precoUnitario,
      valor: precoUnitario,
      saldoDisponivel,
      quantidadeEstoque: saldoDisponivel,
    };
    return this.http.post<Insumo>(API_ENDPOINTS.INSUMOS.BASE, payload).pipe(
      map(res => normalizarInsumo(res ?? payload))
    );
  }

  registrarEntrada(id: string, entrada: RegistrarEntradaInsumoRequest): Observable<Insumo> {
    return this.http.post<Insumo>(API_ENDPOINTS.INSUMOS.ENTRADAS(id), entrada).pipe(
      map(res => normalizarInsumo(res ?? {}))
    );
  }

  private extrairItens(res: unknown): Partial<Insumo>[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      const lista = obj['items'] ?? obj['Items'] ?? obj['itens'] ?? obj['Itens'] ?? obj['data'] ?? obj['Data'];
      if (Array.isArray(lista)) {
        return lista;
      }
    }
    return [];
  }
}
