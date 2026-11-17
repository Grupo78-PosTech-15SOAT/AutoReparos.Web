import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SagaService } from '../../services/saga.service';
import { ESTADOS_SAGA, SagaDetalhe, SagaResumo } from '../../models/saga.model';
import { mensagemDoCodigo } from '../../../../core/http/error-catalog';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

@Component({
  selector: 'app-sagas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    PageContainerComponent,
    IdBadgeComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    AlertBannerComponent,
    CustomSelectComponent
  ],
  template: `
    <app-page-container>
      <header class="page-header">
        <div>
          <h1 class="page-title">Console de Sagas</h1>
          <p class="page-subtitle">Inspeção de estado, etapas, comandos e retentativa de reserva de insumos</p>
        </div>
      </header>

      <section class="filter-bar" aria-label="Filtros de Sagas">
        <div class="form-group">
          <label for="filtroEstado">Estado</label>
          <app-custom-select
            [options]="opcoesEstados"
            [value]="filtroEstado()"
            placeholder="Todos os estados"
            (valueChange)="filtroEstado.set($event)"
            data-testid="filtro-estado"
          ></app-custom-select>
        </div>

        <div class="form-group">
          <label for="filtroParada">Parada há (minutos)</label>
          <input
            id="filtroParada"
            name="filtroParada"
            type="number"
            min="0"
            [ngModel]="filtroParada()"
            (ngModelChange)="filtroParada.set($event)"
            placeholder="Ex.: 60"
            data-testid="filtro-parada"
          />
        </div>

        <button
          type="button"
          class="btn btn-primary"
          (click)="carregar()"
          [disabled]="carregando()"
          data-testid="btn-filtrar"
        >
          Filtrar
        </button>
      </section>

      @if (erro()) {
        <div data-testid="erro-saga">
          <app-alert-banner tipo="erro">{{ erro() }}</app-alert-banner>
        </div>
      }

      @if (mensagemSucesso()) {
        <div data-testid="sucesso-saga">
          <app-alert-banner tipo="sucesso">{{ mensagemSucesso() }}</app-alert-banner>
        </div>
      }

      <div class="sagas-grid">
        <section class="sagas-list-panel">
          <h2>Sagas ({{ sagas().length }})</h2>
          @if (carregando()) {
            <div class="loading-box">
              <app-loading-spinner message="Carregando sagas..."></app-loading-spinner>
            </div>
          } @else if (sagas().length === 0) {
            <p class="empty-msg">Nenhuma saga encontrada para o filtro informado.</p>
          } @else {
            <table class="sagas-table">
              <thead>
                <tr>
                  <th>Ordem de Serviço</th>
                  <th>Estado</th>
                  <th>Atualizada em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of sagas(); track item.ordemServicoId) {
                  <tr [class.selected]="detalhe()?.ordemServicoId === item.ordemServicoId">
                    <td>
                      <app-id-badge [text]="item.ordemServicoId" size="sm"></app-id-badge>
                    </td>
                    <td>
                      <app-status-badge [status]="item.estado" size="sm"></app-status-badge>
                    </td>
                    <td>{{ item.atualizadoEm | date:'short' }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm"
                        (click)="selecionar(item.ordemServicoId)"
                        [attr.data-testid]="'ver-saga-' + item.ordemServicoId"
                      >
                        Ver detalhe
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>

        @if (detalhe(); as d) {
          <section class="saga-detail-panel" data-testid="detalhe-saga">
            <header class="detail-header">
              <h2>Detalhe da Saga <app-id-badge [text]="d.ordemServicoId"></app-id-badge></h2>
              <div data-testid="detalhe-estado">
                <app-status-badge [status]="d.estado"></app-status-badge>
              </div>
            </header>

            @if (d.estado === 'AguardandoInsumos') {
              <div class="retry-box" data-testid="bloco-retentativa">
                <h3>Retentar reserva de insumos</h3>
                <div class="form-group">
                  <label for="motivoRetentativa">Motivo da retentativa *</label>
                  <input
                    id="motivoRetentativa"
                    name="motivoRetentativa"
                    type="text"
                    [ngModel]="motivoRetentativa()"
                    (ngModelChange)="motivoRetentativa.set($event)"
                    placeholder="Informe o motivo (ex.: saldo reposto)"
                    data-testid="motivo-retentativa"
                  />
                </div>
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="!motivoValido() || enviando()"
                  (click)="retentar()"
                  data-testid="btn-retentar"
                >
                  Retentar reserva
                </button>
              </div>
            }

            <div class="detail-section">
              <h3>Etapas ({{ d.etapas.length }})</h3>
              <ul class="detail-list" data-testid="lista-etapas">
                @for (etapa of d.etapas; track etapa.numero) {
                  <li>
                    <strong>#{{ etapa.numero }} {{ etapa.nome }}</strong> — {{ etapa.situacao }}
                    @if (etapa.erroCompensacao) {
                      <span class="text-danger">({{ etapa.erroCompensacao }})</span>
                    }
                  </li>
                }
              </ul>
            </div>

            <div class="detail-section">
              <h3>Comandos ({{ d.comandos.length }})</h3>
              <ul class="detail-list" data-testid="lista-comandos">
                @for (cmd of d.comandos; track $index) {
                  <li>
                    <span class="mono">{{ cmd.tipo }}</span> → {{ cmd.destino }}
                    (tentativas: {{ cmd.tentativas }})
                    @if (cmd.ultimoErro) {
                      <span class="text-danger">— {{ cmd.ultimoErro }}</span>
                    }
                  </li>
                }
              </ul>
            </div>

            <div class="detail-section">
              <h3>Registros ({{ d.registros.length }})</h3>
              <ul class="detail-list" data-testid="lista-registros">
                @for (reg of d.registros; track $index) {
                  <li>
                    <span class="mono">{{ reg.evento }}</span>: {{ reg.descricao }}
                  </li>
                }
              </ul>
            </div>
          </section>
        }
      </div>
    </app-page-container>
  `,
  styles: [`
    .page-header { margin-bottom: 1.25rem; }
    .page-title { font-size: 1.6rem; font-weight: 800; color: var(--text-main, #ffffff); }
    .page-subtitle { color: var(--text-muted, #a1a1aa); font-size: 0.9rem; margin-top: 0.25rem; }
    .filter-bar { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1.25rem; background: var(--bg-card, rgba(255, 255, 255, 0.04)); padding: 1rem; border-radius: var(--radius-md, 10px); border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1)); }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .sagas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .sagas-list-panel, .saga-detail-panel { background: var(--bg-card, rgba(255, 255, 255, 0.04)); border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1)); border-radius: var(--radius-lg, 12px); padding: 1.25rem; }
    .sagas-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
    .sagas-table th, .sagas-table td { text-align: left; padding: 0.6rem; border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1)); }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .detail-section { margin-top: 1rem; }
    .detail-list { list-style: none; padding: 0; margin: 0.5rem 0 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .retry-box { background: rgba(244, 63, 94, 0.08); border: 1px solid var(--border-pink, rgba(244, 63, 94, 0.3)); padding: 1rem; border-radius: var(--radius-md, 8px); margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .loading-box { padding: 2rem 0; display: flex; justify-content: center; }
    .mono { font-family: monospace; }
  `],
})
export class SagasPageComponent implements OnInit {
  private readonly sagaService = inject(SagaService);
  private readonly osJornadaStore = inject(OsJornadaStore);

  readonly estados = ESTADOS_SAGA;
  readonly opcoesEstados: SelectOption[] = [
    { value: '', label: 'Todos os estados' },
    ...ESTADOS_SAGA.map(e => ({ value: e, label: e }))
  ];
  sagas = signal<SagaResumo[]>([]);
  detalhe = signal<SagaDetalhe | null>(null);
  carregando = signal(false);
  enviando = signal(false);
  erro = signal<string | null>(null);
  mensagemSucesso = signal<string | null>(null);

  filtroEstado = signal('');
  filtroParada = signal<number | null>(null);
  motivoRetentativa = signal('');

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.sagaService
      .listar({
        estado: this.filtroEstado() || undefined,
        paradaHaMinutos: this.filtroParada() ?? undefined,
      })
      .subscribe({
        next: lista => {
          this.sagas.set(lista);
          this.carregando.set(false);
          // Atualiza registros conhecidos na jornada
          for (const s of lista) {
            this.osJornadaStore.salvar({
              osId: s.ordemServicoId
            });
          }
        },
        error: err => {
          this.carregando.set(false);
          this.erro.set(mensagemDoCodigo(err?.error?.codigo, 'Não foi possível carregar as sagas.'));
        },
      });
  }

  selecionar(ordemServicoId: string): void {
    this.erro.set(null);
    this.mensagemSucesso.set(null);
    this.motivoRetentativa.set('');
    this.sagaService.obter(ordemServicoId).subscribe({
      next: d => {
        this.detalhe.set(d);
        if (d) {
          this.osJornadaStore.salvar({
            osId: d.ordemServicoId,
            orcamentoId: d.orcamentoId
          });
        }
      },
      error: err => this.erro.set(mensagemDoCodigo(err?.error?.codigo, 'Não foi possível carregar o detalhe da saga.')),
    });
  }

  motivoValido(): boolean {
    return this.motivoRetentativa().trim().length > 0;
  }

  retentar(): void {
    const atual = this.detalhe();
    const motivo = this.motivoRetentativa().trim();
    if (!atual || atual.estado !== 'AguardandoInsumos' || !motivo || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    this.mensagemSucesso.set(null);

    this.sagaService.retentar(atual.ordemServicoId, motivo).subscribe({
      next: res => {
        this.enviando.set(false);
        this.motivoRetentativa.set('');
        this.mensagemSucesso.set('Retentativa de reserva enviada com sucesso.');
        const novoEstado = res?.estado || 'ReservandoInsumos';
        this.detalhe.set({
          ...atual,
          estado: novoEstado,
        });
        this.osJornadaStore.salvar({
          osId: atual.ordemServicoId
        });
      },
      error: err => {
        this.enviando.set(false);
        this.erro.set(
          mensagemDoCodigo(err?.error?.codigo, 'Não foi possível retentar a reserva desta saga.')
        );
      },
    });
  }
}
