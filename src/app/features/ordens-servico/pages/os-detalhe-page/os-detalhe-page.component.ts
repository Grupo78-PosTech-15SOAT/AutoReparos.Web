import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ExecucaoResumo, OsDetalhe } from '../../models/ordem-servico.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { OsCancelamentoComponent } from '../../components/os-cancelamento/os-cancelamento.component';

type Carga<T> =
  | { estado: 'carregando' }
  | { estado: 'restrito' }
  | { estado: 'erro' }
  | { estado: 'vazio' }
  | { estado: 'ok'; dado: T };

@Component({
  selector: 'app-os-detalhe-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    PageContainerComponent,
    IdBadgeComponent,
    OsCancelamentoComponent,
  ],
  template: `
    <app-page-container>
      @if (carregando()) {
        <div class="card-panel aviso" role="status">Carregando OS...</div>
      } @else if (os(); as os) {
        <div class="page-header">
          <div>
            <div class="cabecalho">
              <app-id-badge [text]="'#' + os.id.substring(0, 8)" size="lg"></app-id-badge>
              <app-status-badge [status]="os.status"></app-status-badge>
            </div>
            <h1 class="page-title">Ordem de Serviço</h1>
            <p class="page-subtitle">
              Cliente {{ os.clienteId.substring(0, 8) }} | Veículo {{ os.veiculoId.substring(0, 8) }}
            </p>
            @if (os.observacao) {
              <p class="page-subtitle">Observação: {{ os.observacao }}</p>
            }
          </div>
          <a routerLink="/ordens-servico/fila" class="btn btn-secondary">Voltar ao Kanban</a>
        </div>

        <div class="grade">
          <section class="card-panel" aria-label="Observação">
            <h3 class="secao">Observação</h3>
            <form (ngSubmit)="salvarObservacao()" class="form-obs">
              <label class="form-label" for="observacao-detalhe">Observação da OS</label>
              <textarea
                id="observacao-detalhe"
                class="form-control"
                rows="3"
                [(ngModel)]="observacaoEditada"
                name="observacao"
                [disabled]="salvandoObservacao()"
                placeholder="Informe observações sobre a OS..."
              ></textarea>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="salvandoObservacao()"
              >
                {{ salvandoObservacao() ? 'Salvando...' : 'Salvar observação' }}
              </button>
              @if (observacaoSalva()) {
                <p class="aviso-ok" role="status">Observação salva com sucesso.</p>
              }
            </form>
          </section>

          <section class="card-panel" aria-label="Histórico">
            <h3 class="secao">Histórico</h3>
            <ul class="lista">
              @for (h of os.historico; track $index) {
                <li class="linha">
                  <app-status-badge [status]="h.status" size="sm"></app-status-badge>
                  <span class="data">{{ h.em | date: 'dd/MM/yyyy HH:mm' }}</span>
                </li>
              } @empty {
                <li class="linha">Sem movimentações registradas.</li>
              }
            </ul>
          </section>

          <section class="card-panel" aria-label="Orçamento e Pagamento">
            <h3 class="secao">Orçamento e Pagamento</h3>
            <p class="aviso">Monte o orçamento ou acesse o checkout de pagamento desta OS.</p>
            <div class="acoes-fluxo">
              <a
                routerLink="/orcamentos/novo"
                [queryParams]="{ ordemServicoId: os.id, clienteId: os.clienteId }"
                class="btn btn-primary"
              >
                Montar orçamento
              </a>
              <a
                routerLink="/pagamentos"
                [queryParams]="{ ordemServicoId: os.id }"
                class="btn btn-secondary"
              >
                Abrir pagamento
              </a>
            </div>
          </section>

          <section class="card-panel" aria-label="Execução">
            <h3 class="secao">Execução</h3>
            @switch (execucao().estado) {
              @case ('carregando') {
                <p class="aviso">Carregando execução...</p>
              }
              @case ('restrito') {
                <p class="aviso">Indisponível para o seu perfil.</p>
              }
              @case ('erro') {
                <p class="aviso">Não foi possível carregar a execução.</p>
              }
              @case ('vazio') {
                <p class="aviso">Sem execução para esta OS.</p>
              }
              @case ('ok') {
                @if (execucaoOk(); as e) {
                  <div class="linha">
                    <span>Estado</span>
                    <strong>{{ e.status }}</strong>
                  </div>
                  @if (e.mecanicoId) {
                    <div class="linha">
                      <span>Mecânico</span>
                      <strong>{{ e.mecanicoId.substring(0, 8) }}</strong>
                    </div>
                  }
                }
              }
            }
          </section>

          @if (podeCancelar() && os.status !== 'Cancelada' && os.status !== 'Paga') {
            <app-os-cancelamento [osId]="os.id" (cancelada)="carregar()"></app-os-cancelamento>
          }
        </div>
      } @else {
        <div class="card-panel aviso" role="alert">Não foi possível carregar a OS.</div>
      }
    </app-page-container>
  `,
  styles: [
    `
      .cabecalho {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        margin-bottom: 0.3rem;
      }
      .grade {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.25rem;
      }
      .secao {
        font-family: 'Outfit', sans-serif;
        font-size: 1.05rem;
        color: #ed145b;
        margin-bottom: 0.75rem;
      }
      .form-obs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .acoes-fluxo {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.75rem;
      }
      .lista {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .linha {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.45rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .data {
        color: #a1a1aa;
        font-size: 0.85rem;
      }
      .aviso {
        color: #a1a1aa;
        padding: 0.5rem 0;
      }
      .aviso-ok {
        color: #10b981;
        font-size: 0.85rem;
        margin: 0;
      }
    `,
  ],
})
export class OsDetalhePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  /** Id da OS, ligado ao parâmetro `:id` da rota (withComponentInputBinding ou ActivatedRoute). */
  readonly id = input<string>('');

  readonly os = signal<OsDetalhe | null>(null);
  readonly carregando = signal(true);
  readonly execucao = signal<Carga<ExecucaoResumo>>({ estado: 'carregando' });

  observacaoEditada = '';
  readonly salvandoObservacao = signal(false);
  readonly observacaoSalva = signal(false);

  readonly execucaoOk = computed(() => this.dadoOk(this.execucao()));

  podeCancelar(): boolean {
    const user = this.auth.currentUser();
    return !user || this.auth.hasRole(['Administrador', 'Atendente']);
  }

  ngOnInit() {
    this.carregar();
  }

  private resolverId(): string {
    return this.id() || this.route?.snapshot?.paramMap?.get('id') || '';
  }

  carregar() {
    const id = this.resolverId();
    if (!id) {
      this.carregando.set(false);
      return;
    }

    this.osService
      .obter(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: os => {
          this.os.set(os);
          this.observacaoEditada = os.observacao ?? '';
          this.carregando.set(false);
        },
        error: () => {
          this.os.set(null);
          this.carregando.set(false);
        },
      });

    const user = this.auth.currentUser();
    if (!user || this.auth.hasRole(['Administrador', 'Mecanico'])) {
      this.osService
        .obterExecucao(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: e => this.execucao.set(e ? { estado: 'ok', dado: e } : { estado: 'vazio' }),
          error: err =>
            this.execucao.set(err?.status === 403 ? { estado: 'restrito' } : { estado: 'erro' }),
        });
    } else {
      this.execucao.set({ estado: 'restrito' });
    }
  }

  salvarObservacao() {
    const atual = this.os();
    if (!atual) return;

    this.salvandoObservacao.set(true);
    this.observacaoSalva.set(false);
    const novaObservacao = this.observacaoEditada.trim() || null;

    this.osService
      .atualizarObservacao(atual.id, novaObservacao)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const obsAtualizada = res?.observacao ?? novaObservacao ?? undefined;
          this.os.set({ ...atual, observacao: obsAtualizada });
          this.observacaoEditada = obsAtualizada ?? '';
          this.salvandoObservacao.set(false);
          this.observacaoSalva.set(true);
        },
        error: () => {
          this.salvandoObservacao.set(false);
        },
      });
  }

  private dadoOk<T>(carga: Carga<T>): T | null {
    return carga.estado === 'ok' ? carga.dado : null;
  }
}
