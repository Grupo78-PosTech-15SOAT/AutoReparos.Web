import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ExecucaoResumo, OrcamentoResumo, OsDetalhe } from '../../models/ordem-servico.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { OsCancelamentoComponent } from '../../components/os-cancelamento/os-cancelamento.component';

type Carga<T> = { estado: 'carregando' } | { estado: 'restrito' } | { estado: 'erro' } | { estado: 'vazio' } | { estado: 'ok'; dado: T };

@Component({
  selector: 'app-os-detalhe-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, RouterLink, StatusBadgeComponent, PageContainerComponent, IdBadgeComponent, OsCancelamentoComponent],
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
            <p class="page-subtitle">Cliente {{ os.clienteId.substring(0, 8) }} | Veículo {{ os.veiculoId.substring(0, 8) }}</p>
            @if (os.observacao) {
              <p class="page-subtitle">Observação: {{ os.observacao }}</p>
            }
          </div>
          <a routerLink="/ordens-servico/fila" class="btn btn-secondary">Voltar ao Kanban</a>
        </div>

        <div class="grade">
          <section class="card-panel" aria-label="Histórico">
            <h3 class="secao">Histórico</h3>
            <ul class="lista">
              @for (h of os.historico; track $index) {
                <li class="linha">
                  <app-status-badge [status]="h.status" size="sm"></app-status-badge>
                  <span class="data">{{ h.em | date:'dd/MM/yyyy HH:mm' }}</span>
                </li>
              } @empty {
                <li class="linha">Sem movimentações registradas.</li>
              }
            </ul>
          </section>

          <section class="card-panel" aria-label="Orçamento">
            <h3 class="secao">Orçamento</h3>
            @switch (orcamento().estado) {
              @case ('carregando') { <p class="aviso">Carregando orçamento...</p> }
              @case ('restrito') { <p class="aviso">Indisponível para o seu perfil.</p> }
              @case ('erro') { <p class="aviso">Não foi possível carregar o orçamento.</p> }
              @case ('vazio') { <p class="aviso">Sem orçamento para esta OS.</p> }
              @case ('ok') {
                @if (orcamentoOk(); as o) {
                  <div class="linha"><span>Status</span><strong>{{ o.status }}</strong></div>
                  <div class="linha"><span>Valor</span><strong>R$ {{ o.valor | number:'1.2-2' }}</strong></div>
                  <ul class="lista">
                    @for (item of o.itens; track $index) {
                      <li class="linha">
                        <span>{{ item.nome ?? item.descricao }} x{{ item.quantidade }}</span>
                        <span>R$ {{ item.precoUnitario | number:'1.2-2' }}</span>
                      </li>
                    }
                  </ul>
                }
              }
            }
          </section>

          <section class="card-panel" aria-label="Execução">
            <h3 class="secao">Execução</h3>
            @switch (execucao().estado) {
              @case ('carregando') { <p class="aviso">Carregando execução...</p> }
              @case ('restrito') { <p class="aviso">Indisponível para o seu perfil.</p> }
              @case ('erro') { <p class="aviso">Não foi possível carregar a execução.</p> }
              @case ('vazio') { <p class="aviso">Sem execução para esta OS.</p> }
              @case ('ok') {
                @if (execucaoOk(); as e) {
                  <div class="linha"><span>Estado</span><strong>{{ e.status }}</strong></div>
                  @if (e.mecanicoId) {
                    <div class="linha"><span>Mecânico</span><strong>{{ e.mecanicoId.substring(0, 8) }}</strong></div>
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
  styles: [`
    .cabecalho { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 0.3rem; }
    .grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; }
    .secao { font-family: 'Outfit', sans-serif; font-size: 1.05rem; color: #ED145B; margin-bottom: 0.75rem; }
    .lista { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .data { color: #A1A1AA; font-size: 0.85rem; }
    .aviso { color: #A1A1AA; padding: 0.5rem 0; }
  `]
})
export class OsDetalhePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);
  private readonly auth = inject(AuthService);

  /** Id da OS, ligado ao parâmetro `:id` da rota (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly os = signal<OsDetalhe | null>(null);
  readonly carregando = signal(true);
  readonly orcamento = signal<Carga<OrcamentoResumo>>({ estado: 'carregando' });
  readonly execucao = signal<Carga<ExecucaoResumo>>({ estado: 'carregando' });

  readonly orcamentoOk = computed(() => this.dadoOk(this.orcamento()));
  readonly execucaoOk = computed(() => this.dadoOk(this.execucao()));

  podeCancelar(): boolean {
    return this.auth.hasRole(['Administrador', 'Atendente']);
  }

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    const id = this.id();
    this.osService.obter(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: os => {
        this.os.set(os);
        this.carregando.set(false);
      },
      error: () => {
        this.os.set(null);
        this.carregando.set(false);
      }
    });

    if (this.auth.hasRole(['Administrador', 'Atendente'])) {
      this.osService.obterOrcamento(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: o => this.orcamento.set(o ? { estado: 'ok', dado: o } : { estado: 'vazio' }),
        error: () => this.orcamento.set({ estado: 'erro' })
      });
    } else {
      this.orcamento.set({ estado: 'restrito' });
    }

    if (this.auth.hasRole(['Administrador', 'Mecanico'])) {
      this.osService.obterExecucao(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: e => this.execucao.set(e ? { estado: 'ok', dado: e } : { estado: 'vazio' }),
        error: () => this.execucao.set({ estado: 'erro' })
      });
    } else {
      this.execucao.set({ estado: 'restrito' });
    }
  }

  private dadoOk<T>(carga: Carga<T>): T | null {
    return carga.estado === 'ok' ? carga.dado : null;
  }
}
