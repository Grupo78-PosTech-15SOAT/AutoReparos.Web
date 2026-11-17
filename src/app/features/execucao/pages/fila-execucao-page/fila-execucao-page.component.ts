import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ExecucaoService } from '../../services/execucao.service';
import { ESTADOS_EXECUCAO, ItemFilaExecucao, TipoEtapaExecucao } from '../../models/execucao.model';
import { AuthService } from '../../../auth/services/auth.service';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo, extrairCodigoErro, extrairDetalheErro } from '../../../../core/http/error-catalog';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';

@Component({
  selector: 'app-fila-execucao-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageContainerComponent,
    IdBadgeComponent,
    StatusBadgeComponent,
    CustomSelectComponent,
    AlertBannerComponent
  ],
  template: `
    <app-page-container>
      <header class="page-header">
        <div>
          <h1 class="page-title">Fila de Execução</h1>
          <p class="page-subtitle">Registre etapas de diagnóstico e reparo, conclua ou aponte falha.</p>
        </div>
      </header>

      <section class="card-panel" style="margin-bottom: 1.25rem;" aria-label="Filtros da Fila">
        <form (ngSubmit)="carregar()" class="filtros-grid">
          <div class="form-group">
            <label class="form-label" for="filtro-status">Status</label>
            <app-custom-select
              [options]="statusOptions"
              [value]="filtroStatus"
              (valueChange)="filtroStatus = $event"
              placeholder="Todos os estados"
            ></app-custom-select>
          </div>

          <div class="form-group">
            <label class="form-label" for="filtro-mecanico">Etapas registradas por</label>
            <input
              id="filtro-mecanico"
              type="text"
              [(ngModel)]="filtroMecanico"
              name="filtroMecanico"
              class="form-control"
              placeholder="Responsável / Mecânico"
              data-testid="filtro-mecanico"
            />
          </div>

          <div class="form-group" style="display: flex; align-items: flex-end;">
            <button type="submit" class="btn btn-primary" data-testid="btn-filtrar-fila" [disabled]="carregando()">
              Filtrar
            </button>
          </div>
        </form>
      </section>

      @if (erro(); as mensagemErro) {
        <div data-testid="erro-execucao">
          <app-alert-banner tipo="erro">{{ mensagemErro }}</app-alert-banner>
        </div>
      }

      <section class="card-panel" aria-label="Itens da Fila">
        @if (carregando()) {
          <p role="status" class="detalhe">Carregando fila de execução...</p>
        } @else {
          <div class="lista-execucoes">
            @for (item of itens(); track item.id) {
              <div class="execucao-card" data-testid="item-fila-execucao">
                <header class="cabecalho-item">
                  <div class="identificadores">
                    <span class="label-info">Execução:</span>
                    <app-id-badge [text]="item.id"></app-id-badge>
                    <span class="label-info">OS:</span>
                    <app-id-badge [text]="item.ordemServicoId"></app-id-badge>
                  </div>
                  <div class="status-container">
                    @if (item.intervencaoRequerida) {
                      <span class="badge-intervencao" data-testid="badge-intervencao">⚠️ Intervenção Requerida</span>
                    }
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </div>
                </header>

                @if (item.motivoFalha) {
                  <div class="falha-box" data-testid="motivo-falha">
                    <strong>Motivo da Falha:</strong> {{ item.motivoFalha }}
                  </div>
                }

                @if (item.etapas && item.etapas.length > 0) {
                  <div class="etapas-historico" data-testid="historico-etapas">
                    <span class="etapas-titulo">Etapas Registradas ({{ item.etapas.length }}):</span>
                    <ul class="etapas-lista">
                      @for (et of item.etapas; track et.sequencia) {
                        <li class="etapa-item">
                          <strong>#{{ et.sequencia }} [{{ et.tipo }}]</strong>
                          <span>{{ et.descricao }}</span>
                          @if (ehDescricaoAutomatica(et.descricao)) {
                            <span class="badge-auto" data-testid="badge-descricao-automatica">(descrição automática)</span>
                          }
                          @if (et.responsavel) {
                            <span class="etapa-responsavel">por {{ et.responsavel }}</span>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }

                <div class="etapa-input-container">
                  <label class="form-label" [for]="'desc-' + item.id">Descrição da etapa</label>
                  <div class="input-with-hint">
                    <input
                      [id]="'desc-' + item.id"
                      type="text"
                      class="form-control input-sm"
                      [(ngModel)]="descricoes[item.id]"
                      [name]="'desc-' + item.id"
                      placeholder="Descrição personalizada (ou deixe em branco para automática)"
                    />
                    @if (!descricoes[item.id]?.trim()) {
                      <span class="hint-auto" data-testid="hint-auto-descricao">Automática ao registrar</span>
                    }
                  </div>
                </div>

                <div class="acoes-item">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-testid="btn-etapa-diagnostico"
                    [disabled]="enviando()"
                    (click)="registrarEtapa(item.id, 'Diagnostico')"
                  >
                    Etapa: Diagnóstico
                  </button>

                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-testid="btn-etapa-reparo"
                    [disabled]="enviando()"
                    (click)="registrarEtapa(item.id, 'Reparo')"
                  >
                    Etapa: Reparo
                  </button>

                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    data-testid="btn-concluir-execucao"
                    [disabled]="enviando()"
                    (click)="concluir(item.id)"
                  >
                    Concluir
                  </button>

                  <div class="grupo-motivo">
                    <input
                      type="text"
                      class="form-control input-sm"
                      [(ngModel)]="motivos[item.id]"
                      [name]="'motivo-' + item.id"
                      placeholder="Motivo (falha ou reexecução)"
                    />
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      data-testid="btn-falha-execucao"
                      [disabled]="enviando()"
                      (click)="marcarFalha(item.id, motivos[item.id])"
                    >
                      Marcar falha
                    </button>

                    @if (ehAdministrador()) {
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-testid="btn-reexecutar-execucao"
                        [disabled]="enviando()"
                        (click)="reexecutar(item.id, motivos[item.id])"
                      >
                        Reexecutar
                      </button>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <p class="detalhe">Nenhuma execução na fila.</p>
            }
          </div>
        }
      </section>
    </app-page-container>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .page-title { font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0; }
    .page-subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem; }
    .filtros-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .card-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }
    .form-control {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      color: var(--text-main);
      outline: none;
    }
    .lista-execucoes { display: flex; flex-direction: column; gap: 1rem; }
    .execucao-card { padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-surface); display: flex; flex-direction: column; gap: 0.75rem; }
    .cabecalho-item { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .identificadores { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .label-info { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
    .status-container { display: flex; align-items: center; gap: 0.5rem; }
    .badge-intervencao { background: rgba(245, 158, 11, 0.15); color: var(--accent-yellow, #f59e0b); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 600; }
    .falha-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; color: var(--accent-red, #ef4444); font-size: 0.85rem; }
    .etapas-historico { background: var(--bg-card); border-radius: var(--radius-sm); padding: 0.75rem; border: 1px solid var(--border-color); }
    .etapas-titulo { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 0.35rem; }
    .etapas-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .etapa-item { font-size: 0.825rem; color: var(--text-main); display: flex; gap: 0.5rem; align-items: center; }
    .badge-auto { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
    .etapa-responsavel { color: var(--text-muted); font-size: 0.75rem; font-style: italic; }
    .etapa-input-container { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.25rem; }
    .input-with-hint { position: relative; display: flex; align-items: center; }
    .input-with-hint input { padding-right: 150px; }
    .hint-auto { position: absolute; right: 0.75rem; font-size: 0.75rem; color: var(--accent-cyan, #06b6d4); font-style: italic; pointer-events: none; }
    .acoes-item { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 0.5rem; }
    .grupo-motivo { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; flex: 1; min-width: 240px; }
    .input-sm { padding: 0.35rem 0.65rem; font-size: 0.85rem; flex: 1; }
    .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.8rem; }
    .detalhe { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0; }
  `]
})
export class FilaExecucaoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly execucaoService = inject(ExecucaoService);
  private readonly auth = inject(AuthService);

  readonly statusOptions: SelectOption[] = [
    { value: '', label: 'Todos os estados' },
    ...ESTADOS_EXECUCAO.map(e => ({ value: e, label: e }))
  ];

  filtroStatus = '';
  filtroMecanico = '';
  descricoes: Record<string, string> = {};
  motivos: Record<string, string> = {};

  readonly itens = signal<ItemFilaExecucao[]>([]);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  ehAdministrador(): boolean {
    return this.auth.hasRole(['Administrador']);
  }

  ehDescricaoAutomatica(desc?: string): boolean {
    if (!desc) return false;
    return ['Diagnóstico técnico realizado', 'Reparo executado'].includes(desc.trim());
  }

  carregar(): void {
    this.carregando.set(true);
    this.execucaoService
      .listarFila({
        status: this.filtroStatus,
        mecanico: this.filtroMecanico,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: lista => {
          this.itens.set(lista);
          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
        },
      });
  }

  registrarEtapa(execucaoId: string, tipo: TipoEtapaExecucao): void {
    this.enviando.set(true);
    this.erro.set(null);
    const descricao = this.descricoes[execucaoId];

    this.execucaoService
      .registrarEtapa(execucaoId, tipo, descricao)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.descricoes[execucaoId] = '';
          this.carregar();
        },
        error: (e: HttpErrorResponse) => this.tratarErro(e),
      });
  }

  concluir(execucaoId: string): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.execucaoService
      .concluir(execucaoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.carregar();
        },
        error: (e: HttpErrorResponse) => this.tratarErro(e),
      });
  }

  marcarFalha(execucaoId: string, motivo = ''): void {
    const motivoLimpo = (motivo || this.motivos[execucaoId] || '').trim();
    if (!motivoLimpo) return;

    this.enviando.set(true);
    this.erro.set(null);
    this.execucaoService
      .marcarFalha(execucaoId, motivoLimpo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.carregar();
        },
        error: (e: HttpErrorResponse) => this.tratarErro(e),
      });
  }

  reexecutar(execucaoId: string, motivo = ''): void {
    const motivoLimpo = (motivo || this.motivos[execucaoId] || '').trim();
    if (!motivoLimpo || !this.ehAdministrador()) return;

    this.enviando.set(true);
    this.erro.set(null);
    this.execucaoService
      .reexecutar(execucaoId, motivoLimpo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.carregar();
        },
        error: (e: HttpErrorResponse) => this.tratarErro(e),
      });
  }

  private tratarErro(e: HttpErrorResponse): void {
    const codigo = extrairCodigoErro(e.error);
    const detalhe = extrairDetalheErro(e.error);
    const padrao = MENSAGENS_POR_STATUS[e.status]?.mensagem ?? 'Não foi possível executar a operação.';
    this.erro.set(mensagemDoCodigo(codigo, detalhe ?? padrao));
    this.enviando.set(false);
  }
}
