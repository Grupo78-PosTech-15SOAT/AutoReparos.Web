import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, catchError, forkJoin, from, map, mergeMap, of, shareReplay, switchMap, toArray } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { STATUS_TRATADOS_NA_TELA } from '../../../core/http/http-context';
import { OsJornadaStore } from '../../../core/store/os-jornada.store';
import { AuthService } from '../../auth/services/auth.service';
import { Cliente } from '../../clientes/models/cliente.model';
import { Veiculo } from '../../veiculos/models/veiculo.model';
import { SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { idCurto } from '../../../shared/components/id-badge/id-badge.component';
import { getStatusOsInfo } from '../../../shared/utils/status-os.utils';
import { OsDetalhe } from '../models/ordem-servico.model';
import { OrdemServicoService } from './ordem-servico.service';

/** OS com os dados de veículo e cliente que a tela precisa para ser reconhecida. */
export interface OsEnriquecida {
  id: string;
  codigo: string;
  status: string;
  clienteId?: string;
  veiculoId?: string;
  placa?: string;
  modelo?: string;
  marca?: string;
  clienteNome?: string;
  clienteDocumento?: string;
}

/** Máximo de consultas simultâneas ao montar a lista de OS conhecidas. */
export const CONCORRENCIA_CONSULTAS = 6;

/** Máximo de OS conhecidas consultadas (as mais recentes de cada fonte vêm primeiro). */
export const LIMITE_OS_CONHECIDAS = 50;

/** Falhas de cadastro não viram toast: a tela mostra o id no lugar. */
const CONTEXTO_SILENCIOSO = () => new HttpContext().set(STATUS_TRATADOS_NA_TELA, [400, 403, 404, 500, 502, 503]);

/** Placa em maiúsculas com hífen (`ABC-1D23`); vazia quando não há placa. */
export function formatarPlaca(placa?: string | null): string {
  if (!placa) return '';
  const limpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return limpa.length === 7 ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : placa.toUpperCase();
}

/** Opção de seletor: `#código · placa · modelo`, com cliente e estado na segunda linha. */
export function opcaoDeOs(os: OsEnriquecida): SelectOption {
  const placa = formatarPlaca(os.placa);
  const label = [os.codigo, placa, os.modelo].filter(Boolean).join(' · ');
  const descricao = [os.clienteNome || 'Cliente não identificado', getStatusOsInfo(os.status).label].join(' · ');
  const palavrasChave = [os.id, placa, os.placa, os.modelo, os.marca, os.clienteNome, os.clienteDocumento]
    .filter(Boolean)
    .join(' ');
  return { value: os.id, label, descricao, palavrasChave };
}

/** OS `Recebida` primeiro (as que ainda esperam orçamento); a ordem original se mantém no resto. */
export function ordenarParaOrcamento(lista: OsEnriquecida[]): OsEnriquecida[] {
  return [...lista.filter(o => o.status === 'Recebida'), ...lista.filter(o => o.status !== 'Recebida')];
}

@Injectable({ providedIn: 'root' })
export class OsConhecidasService {
  private readonly http = inject(HttpClient);
  private readonly osService = inject(OrdemServicoService);
  private readonly jornada = inject(OsJornadaStore);
  private readonly auth = inject(AuthService);

  private readonly veiculos = new Map<string, Observable<Veiculo | null>>();
  private readonly clientes = new Map<string, Observable<Cliente | null>>();

  /** Veículo por id, com cache em memória (uma requisição por id). `null` quando falha. */
  veiculo(id?: string | null): Observable<Veiculo | null> {
    if (!id) return of(null);
    let cache = this.veiculos.get(id);
    if (!cache) {
      cache = this.http
        .get<Veiculo>(API_ENDPOINTS.VEICULOS.BY_ID(encodeURIComponent(id)), { context: CONTEXTO_SILENCIOSO() })
        .pipe(
          catchError(() => of(null)),
          shareReplay(1)
        );
      this.veiculos.set(id, cache);
    }
    return cache;
  }

  /** Cliente por id, com cache em memória. `null` quando falha. */
  cliente(id?: string | null): Observable<Cliente | null> {
    if (!id) return of(null);
    let cache = this.clientes.get(id);
    if (!cache) {
      cache = this.http
        .get<Cliente>(API_ENDPOINTS.CLIENTES.BY_ID(encodeURIComponent(id)), { context: CONTEXTO_SILENCIOSO() })
        .pipe(
          catchError(() => of(null)),
          shareReplay(1)
        );
      this.clientes.set(id, cache);
    }
    return cache;
  }

  /** Junta veículo e cliente a uma OS já carregada. */
  enriquecer(os: Pick<OsDetalhe, 'id' | 'status' | 'clienteId' | 'veiculoId'>): Observable<OsEnriquecida> {
    return forkJoin({ v: this.veiculo(os.veiculoId), c: this.cliente(os.clienteId) }).pipe(
      map(({ v, c }) => ({
        id: os.id,
        codigo: idCurto(os.id),
        status: os.status,
        clienteId: os.clienteId,
        veiculoId: os.veiculoId,
        placa: v?.placa,
        modelo: v?.modelo,
        marca: v?.marca,
        clienteNome: c?.nome,
        clienteDocumento: c?.documento,
      }))
    );
  }

  /** Carrega uma OS por id (ex.: UUID colado) e enriquece; `null` quando não existe. */
  resolver(id: string): Observable<OsEnriquecida | null> {
    return this.osService.obter(id).pipe(
      switchMap(os => (os ? this.enriquecer(os) : of(null))),
      catchError(() => of(null))
    );
  }

  /**
   * Ids de OS conhecidos: atalho local, Sagas (Administrador) e fila de execução, sem repetição,
   * limitados a `LIMITE_OS_CONHECIDAS` (uma OS fora da lista é achada colando o código completo).
   */
  ids(): Observable<string[]> {
    const locais = this.jornada.registros().map(r => r.osId);
    const sagas$ = this.auth.hasRole(['Administrador'])
      ? this.osService.listarSagasAdmin().pipe(catchError(() => of([])))
      : of([]);
    const fila$ = this.osService.listarFilaExecucao().pipe(
      map(res => res.itens),
      catchError(() => of([]))
    );
    return forkJoin({ sagas: sagas$, fila: fila$ }).pipe(
      map(({ sagas, fila }) => {
        const todos = [...locais, ...sagas.map(s => s.ordemServicoId), ...fila.map(f => f.ordemServicoId ?? '')];
        return Array.from(new Set(todos.filter(Boolean))).slice(0, LIMITE_OS_CONHECIDAS);
      })
    );
  }

  /** Lista as OS conhecidas já enriquecidas, na ordem dos ids; OS que não carregam ficam de fora. */
  carregar(): Observable<OsEnriquecida[]> {
    return this.ids().pipe(
      switchMap(ids => {
        if (ids.length === 0) return of([] as OsEnriquecida[]);
        return from(ids).pipe(
          mergeMap(id => this.resolver(id), CONCORRENCIA_CONSULTAS),
          toArray(),
          map(lista => {
            const posicao = new Map(ids.map((id, i) => [id, i]));
            return lista
              .filter((os): os is OsEnriquecida => !!os)
              .sort((a, b) => (posicao.get(a.id) ?? 0) - (posicao.get(b.id) ?? 0));
          })
        );
      })
    );
  }
}
