import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';
import { PlacaBadgeComponent } from '../../../../shared/components/placa-badge/placa-badge.component';
import { DataHoraComponent } from '../../../../shared/components/data-hora/data-hora.component';
import { STATUS_OS, STATUS_OS_MAP, StatusOS, getStatusOsInfo } from '../../../../shared/utils/status-os.utils';
import { Veiculo } from '../../../veiculos/models/veiculo.model';
import { Cliente } from '../../../clientes/models/cliente.model';
import {
  ExecucaoResumo,
  KanbanCard,
  KanbanColumn,
  OsDetalhe,
  SagaAdminResumo,
} from '../../models/ordem-servico.model';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { OsConhecidasService, formatarPlaca } from '../../services/os-conhecidas.service';

/** Cor do status (token `--status-*`) usada no cabeçalho da coluna. */
export function corDoStatus(status: string): string {
  const classe = getStatusOsInfo(status).cssClass;
  return classe === 'status-falha' ? 'var(--danger)' : `var(--${classe}, var(--border-color))`;
}

@Component({
  selector: 'app-os-kanban-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    PageContainerComponent,
    StatusBadgeComponent,
    IdBadgeComponent,
    AlertBannerComponent,
    PlacaBadgeComponent,
    DataHoraComponent,
  ],
  template: `
    <app-page-container type="kanban">
      <div class="page-header kanban-header">
        <div>
          <h1 class="page-title">Ordens de Serviço</h1>
          <p class="page-subtitle">Quadro por etapa</p>
        </div>
        <div class="header-actions">
          <form (ngSubmit)="buscarPorCodigo()" class="busca-codigo-form" role="search">
            <div class="busca-campo">
              <svg class="busca-icone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                [(ngModel)]="codigoBusca"
                name="codigoBusca"
                placeholder="Código da OS"
                aria-label="Código da OS"
                class="form-control busca-input"
                data-testid="busca-codigo"
              />
            </div>
            <button
              type="submit"
              class="btn btn-secondary"
              [disabled]="buscandoCodigo() || !codigoBusca.trim()"
            >
              {{ buscandoCodigo() ? 'Buscando...' : 'Buscar' }}
            </button>
          </form>
          <button
            type="button"
            (click)="carregarQuadro()"
            class="btn btn-ghost btn-icon"
            aria-label="Atualizar quadro"
            title="Atualizar quadro"
            data-testid="btn-atualizar-quadro"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
          <a routerLink="/ordens-servico/nova" class="btn btn-primary">+ Nova OS</a>
        </div>
      </div>

      @if (erroBusca(); as msg) {
        <p class="erro-busca" role="alert">{{ msg }}</p>
      }

      @if (acessoExecucaoRestrito()) {
        <div data-testid="aviso-execucao-restrita" class="aviso">
          <app-alert-banner tipo="info">
            Sem acesso à fila de execução: seu perfil não possui permissão para visualizar o andamento operacional na oficina.
          </app-alert-banner>
        </div>
      }

      @if (erroFila(); as msg) {
        <app-alert-banner tipo="erro" data-testid="aviso-erro-fila" class="aviso">
          {{ msg }}
        </app-alert-banner>
      }

      @if (carregando()) {
        <div class="loading-banner" role="status">Carregando fila...</div>
      }

      <div class="kanban-wrapper">
        <div class="kanban-board">
          @for (col of colunas(); track col.status) {
            <section
              class="kanban-column"
              [attr.data-status]="col.status"
              [attr.aria-label]="col.label"
            >
              <header class="column-header" [style.border-bottom-color]="corDoStatus(col.status)">
                <span class="column-title">
                  <span class="column-dot" [style.background]="corDoStatus(col.status)" aria-hidden="true"></span>
                  {{ col.label }}
                </span>
                <span class="column-count">{{ col.cards.length }}</span>
              </header>

              <div class="column-cards">
                @for (card of col.cards; track card.id) {
                  @let veiculo = veiculoDe(card);
                  @let cliente = clienteDe(card);
                  <article class="kanban-card" data-testid="kanban-card">
                    <div class="card-identidade">
                      @if (veiculo?.placa) {
                        <app-placa-badge [placa]="placa(veiculo!.placa)" size="sm"></app-placa-badge>
                        <span class="card-modelo" data-testid="card-modelo">{{ veiculo!.modelo }}</span>
                      } @else {
                        <app-id-badge [text]="card.id" size="sm"></app-id-badge>
                      }
                    </div>
                    @if (cliente?.nome) {
                      <span class="card-cliente text-muted" data-testid="card-cliente">{{ cliente!.nome }}</span>
                    }
                    <div class="card-meta">
                      @if (veiculo?.placa) {
                        <app-id-badge [text]="card.id" size="sm"></app-id-badge>
                      }
                      <app-status-badge [status]="card.status" size="sm"></app-status-badge>
                    </div>
                    <div class="card-rodape">
                      @if (card.atualizadaEm) {
                        <app-data-hora class="text-subtle" [valor]="card.atualizadaEm" modo="relativo"></app-data-hora>
                      } @else {
                        <span></span>
                      }
                      <a [routerLink]="['/ordens-servico', card.id]" class="btn btn-ghost btn-sm" data-testid="card-detalhes">
                        Detalhes ›
                      </a>
                    </div>
                  </article>
                } @empty {
                  <div class="empty-column">Nenhuma OS nesta etapa</div>
                }
              </div>
            </section>
          }
        </div>
      </div>
    </app-page-container>
  `,
  styles: [
    `
      .kanban-header { margin-bottom: 1.25rem; }
      .header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
      .busca-codigo-form { display: flex; gap: 0.5rem; align-items: center; }
      .busca-campo { position: relative; display: flex; align-items: center; }
      .busca-icone { position: absolute; left: 0.75rem; color: var(--text-subtle); pointer-events: none; }
      .busca-input { width: 200px; padding-left: 2.25rem; }
      .aviso { display: block; margin-bottom: 1rem; }
      .erro-busca { color: var(--danger); margin: 0 0 1rem; font-size: 0.9rem; }
      .loading-banner { padding: 0.75rem 1rem; margin-bottom: 1rem; border-radius: var(--radius-sm); background: var(--info-bg); color: var(--info); font-size: 0.9rem; }
      .kanban-wrapper { flex: 1; width: 100%; overflow-x: auto; padding-bottom: 0.5rem; }
      .kanban-board { display: grid; grid-template-columns: repeat(7, minmax(250px, 1fr)); gap: 1rem; min-width: 1800px; }
      .kanban-column { display: flex; flex-direction: column; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.9rem; min-height: 320px; }
      .column-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.65rem; margin-bottom: 0.85rem; border-bottom: 2px solid var(--border-color); }
      .column-title { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.9rem; color: var(--text-main); }
      .column-dot { width: 8px; height: 8px; border-radius: 50%; }
      .column-count { background: var(--mono-badge-bg); color: var(--text-muted); padding: 0.2rem 0.55rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
      .column-cards { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
      .kanban-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.8rem; display: flex; flex-direction: column; gap: 0.45rem; }
      .card-identidade { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
      .card-modelo { font-weight: 600; font-size: 0.9rem; }
      .card-cliente { font-size: 0.82rem; }
      .card-meta { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
      .card-rodape { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; font-size: 0.78rem; }
      .empty-column { text-align: center; padding: 2rem 0.75rem; font-size: 0.78rem; color: var(--text-subtle); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); }
    `,
  ],
})
export class OsKanbanPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);
  private readonly auth = inject(AuthService);
  private readonly osJornadaStore = inject(OsJornadaStore);
  private readonly osConhecidas = inject(OsConhecidasService);

  readonly placa = formatarPlaca;
  readonly corDoStatus = corDoStatus;
  /** Veículos e clientes resolvidos (em cache no serviço), por id; `null` quando falhou. */
  readonly veiculos = signal<Record<string, Veiculo | null>>({});
  readonly clientes = signal<Record<string, Cliente | null>>({});
  private readonly pedidos = new Set<string>();

  codigoBusca = '';
  readonly carregando = signal(false);
  readonly buscandoCodigo = signal(false);
  readonly erroBusca = signal<string | null>(null);
  readonly acessoExecucaoRestrito = signal(false);
  readonly erroFila = signal<string | null>(null);
  readonly cartoesPorId = signal<Record<string, KanbanCard>>({});

  readonly colunas = computed<KanbanColumn[]>(() => {
    const todos = Object.values(this.cartoesPorId());
    return STATUS_OS.map(status => ({
      status,
      label: STATUS_OS_MAP[status].label,
      cards: todos.filter(c => c.status === status),
    }));
  });

  ngOnInit(): void {
    this.carregarQuadro();
  }

  carregarQuadro(): void {
    this.carregando.set(true);
    this.erroFila.set(null);

    const fila$ = this.osService
      .listarFilaExecucao()
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err?.status !== 403) {
            this.erroFila.set('Não foi possível carregar a fila de execução.');
          }
          return of({ itens: [] as ExecucaoResumo[], restrito: err?.status === 403 });
        })
      );

    const sagas$ = this.auth.hasRole(['Administrador'])
      ? this.osService.listarSagasAdmin().pipe(catchError(() => of([] as SagaAdminResumo[])))
      : of([] as SagaAdminResumo[]);

    const idsAtalho = Array.from(new Set(this.osJornadaStore.registros().map(r => r.osId).filter(Boolean)));
    const atalhos$ = idsAtalho.length > 0
      ? forkJoin(idsAtalho.map(id => this.osService.obter(id).pipe(catchError(() => of(null)))))
      : of([] as (OsDetalhe | null)[]);

    forkJoin({ fila: fila$, sagas: sagas$, atalhos: atalhos$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ fila, sagas, atalhos }) => {
        this.acessoExecucaoRestrito.set(!!fila.restrito);
        const atual = { ...this.cartoesPorId() };

        for (const saga of sagas) {
          const osId = saga.ordemServicoId;
          if (!osId) continue;
          atual[osId] = {
            ...atual[osId],
            id: osId,
            status: this.mapearStatusParaColuna(saga.estado),
            atualizadaEm: saga.atualizadoEm,
            origem: 'saga',
          };
        }

        for (const exec of fila.itens) {
          const osId = exec.ordemServicoId || exec.id;
          if (!osId) continue;
          atual[osId] = {
            ...atual[osId],
            id: osId,
            clienteId: exec.clienteId ?? atual[osId]?.clienteId,
            veiculoId: exec.veiculoId ?? atual[osId]?.veiculoId,
            status: this.mapearStatusParaColuna(exec.status, exec.intervencaoRequerida),
            atualizadaEm: exec.atualizadaEm ?? atual[osId]?.atualizadaEm,
            origem: 'execucao',
          };
        }

        for (const os of atalhos) {
          if (!os) continue;
          atual[os.id] = {
            ...atual[os.id],
            id: os.id,
            clienteId: os.clienteId ?? atual[os.id]?.clienteId,
            veiculoId: os.veiculoId ?? atual[os.id]?.veiculoId,
            observacao: os.observacao ?? atual[os.id]?.observacao,
            status: this.mapearStatusParaColuna(os.status),
            origem: 'os',
          };
        }

        this.cartoesPorId.set(atual);
        this.carregando.set(false);
        this.resolverCadastros();
      });
  }

  buscarPorCodigo(): void {
    const codigo = this.codigoBusca.trim();
    if (!codigo) return;

    this.buscandoCodigo.set(true);
    this.erroBusca.set(null);
    this.osService
      .obter(codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: os => {
          this.incluirOuAtualizarCartao({
            id: os.id,
            status: this.mapearStatusParaColuna(os.status),
            clienteId: os.clienteId,
            veiculoId: os.veiculoId,
            observacao: os.observacao,
            origem: 'os',
          });
          this.buscandoCodigo.set(false);
        },
        error: () => {
          this.erroBusca.set('OS não encontrada para o código informado.');
          this.buscandoCodigo.set(false);
        },
      });
  }

  incluirOuAtualizarCartao(card: KanbanCard): void {
    this.cartoesPorId.update(atual => ({
      ...atual,
      [card.id]: card,
    }));
    this.resolverCadastros();
  }

  veiculoDe(card: KanbanCard): Veiculo | null {
    return card.veiculoId ? this.veiculos()[card.veiculoId] ?? null : null;
  }

  clienteDe(card: KanbanCard): Cliente | null {
    return card.clienteId ? this.clientes()[card.clienteId] ?? null : null;
  }

  /** Busca placa, modelo e cliente de cada cartão uma vez (o serviço guarda em cache). */
  private resolverCadastros(): void {
    for (const card of Object.values(this.cartoesPorId())) {
      const veiculoId = card.veiculoId;
      if (veiculoId && !this.pedidos.has('v:' + veiculoId)) {
        this.pedidos.add('v:' + veiculoId);
        this.osConhecidas
          .veiculo(veiculoId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(v => this.veiculos.update(atual => ({ ...atual, [veiculoId]: v })));
      }
      const clienteId = card.clienteId;
      if (clienteId && !this.pedidos.has('c:' + clienteId)) {
        this.pedidos.add('c:' + clienteId);
        this.osConhecidas
          .cliente(clienteId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(c => this.clientes.update(atual => ({ ...atual, [clienteId]: c })));
      }
    }
  }

  mapearStatusParaColuna(statusBruto: string, intervencaoRequerida?: boolean): StatusOS {
    if (intervencaoRequerida) {
      return 'IntervencaoRequerida';
    }
    if ((STATUS_OS as readonly string[]).includes(statusBruto)) {
      return statusBruto as StatusOS;
    }
    switch (statusBruto) {
      case 'ReservandoInsumos':
      case 'AguardandoInsumos':
        return 'OrcamentoAprovado';
      case 'Fila':
      case 'ExecucaoLiberada':
        return 'EmExecucao';
      case 'ExecucaoConcluida':
        return 'Concluida';
      case 'PagamentoCapturado':
        return 'Paga';
      case 'Falhou':
      case 'CompensacaoFalhou':
        return 'IntervencaoRequerida';
      case 'Compensando':
      case 'Compensada':
        return 'Cancelada';
      default:
        return 'Recebida';
    }
  }
}
