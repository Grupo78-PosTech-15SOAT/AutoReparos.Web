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
import { STATUS_OS, STATUS_OS_MAP, StatusOS } from '../../../../shared/utils/status-os.utils';
import {
  ExecucaoResumo,
  KanbanCard,
  KanbanColumn,
  OsDetalhe,
  SagaAdminResumo,
} from '../../models/ordem-servico.model';
import { OrdemServicoService } from '../../services/ordem-servico.service';

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
  ],
  template: `
    <app-page-container type="kanban">
      <div class="page-header" style="margin-bottom: 1.25rem;">
        <div>
          <h1 class="page-title">Fila Kanban</h1>
          <p class="page-subtitle">Acompanhamento das 7 etapas reais da Ordem de Serviço</p>
        </div>
        <div class="header-actions">
          <form (ngSubmit)="buscarPorCodigo()" class="busca-codigo-form">
            <input
              type="text"
              [(ngModel)]="codigoBusca"
              name="codigoBusca"
              placeholder="Buscar OS por código (ID)..."
              aria-label="Código da OS"
              class="form-control busca-input"
            />
            <button
              type="submit"
              class="btn btn-secondary"
              [disabled]="buscandoCodigo() || !codigoBusca.trim()"
            >
              {{ buscandoCodigo() ? 'Buscando...' : 'Buscar por código' }}
            </button>
          </form>
          <button type="button" (click)="carregarQuadro()" class="btn btn-secondary">
            Atualizar
          </button>
          <a routerLink="/ordens-servico/nova" class="btn btn-primary">+ Nova OS</a>
        </div>
      </div>

      @if (erroBusca(); as msg) {
        <p class="erro-busca" role="alert">{{ msg }}</p>
      }

      @if (acessoExecucaoRestrito()) {
        <div data-testid="aviso-execucao-restrita" style="margin-bottom: 1rem;">
          <app-alert-banner tipo="info">
            Sem acesso à fila de execução: seu perfil não possui permissão para visualizar o andamento operacional na oficina.
          </app-alert-banner>
        </div>
      }

      @if (erroFila(); as msg) {
        <app-alert-banner tipo="erro" data-testid="aviso-erro-fila" style="margin-bottom: 1rem;">
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
              <header class="column-header">
                <div>
                  <span class="column-title">{{ col.label }}</span>
                  <span class="column-status-code">{{ col.status }}</span>
                </div>
                <span class="column-count">{{ col.cards.length }}</span>
              </header>

              <div class="column-cards">
                @for (card of col.cards; track card.id) {
                  <article class="kanban-card">
                    <div class="card-top">
                      <app-id-badge [text]="'#' + card.id.slice(0, 8)" size="sm"></app-id-badge>
                      <app-status-badge [status]="card.status" size="sm"></app-status-badge>
                    </div>
                    @if (card.observacao) {
                      <p class="card-obs">{{ card.observacao }}</p>
                    }
                    <a [routerLink]="['/ordens-servico', card.id]" class="card-link">
                      Ver detalhe
                    </a>
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
      .header-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .busca-codigo-form {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .busca-input {
        min-width: 220px;
      }
      .erro-busca {
        color: var(--primary);
        margin: 0 0 1rem;
        font-size: 0.9rem;
      }
      .loading-banner {
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border-radius: 8px;
        background: rgba(59, 130, 246, 0.1);
        color: var(--status-recebida);
        font-size: 0.9rem;
      }
      .kanban-wrapper {
        flex: 1;
        width: 100%;
        overflow-x: auto;
        padding-bottom: 0.5rem;
      }
      .kanban-board {
        display: grid;
        grid-template-columns: repeat(7, minmax(250px, 1fr));
        gap: 1rem;
        min-width: 1800px;
      }
      .kanban-column {
        display: flex;
        flex-direction: column;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 0.9rem;
        min-height: 320px;
      }
      .column-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0.65rem;
        margin-bottom: 0.85rem;
        border-bottom: 2px solid rgba(237, 20, 91, 0.45);
      }
      .column-title {
        display: block;
        font-weight: 700;
        font-size: 0.9rem;
        color: var(--text-main);
      }
      .column-status-code {
        display: block;
        font-size: 0.72rem;
        color: var(--text-subtle);
      }
      .column-count {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-muted);
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .column-cards {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex: 1;
      }
      .kanban-card {
        background: rgba(24, 24, 28, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }
      .card-obs {
        margin: 0;
        font-size: 0.82rem;
        color: var(--text-muted);
      }
      .card-link {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--primary);
        text-decoration: none;
      }
      .empty-column {
        text-align: center;
        padding: 2rem 0.75rem;
        font-size: 0.78rem;
        color: var(--text-subtle);
        border: 1px dashed rgba(255, 255, 255, 0.06);
        border-radius: 8px;
      }
    `,
  ],
})
export class OsKanbanPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);
  private readonly auth = inject(AuthService);
  private readonly osJornadaStore = inject(OsJornadaStore);

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
