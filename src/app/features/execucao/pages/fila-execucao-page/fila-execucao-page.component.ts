import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ExecucaoService } from '../../services/execucao.service';
import { ItemFilaExecucao, TipoEtapaExecucao } from '../../models/execucao.model';
import { AuthService } from '../../../auth/services/auth.service';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo } from '../../../../core/http/error-catalog';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';

@Component({
  selector: 'app-fila-execucao-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageContainerComponent],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">Fila de Execução</h1>
          <p class="page-subtitle">Registre etapas de diagnóstico e reparo, conclua ou aponte falha.</p>
        </div>
      </div>

      <section class="card-panel" style="margin-bottom: 1.25rem;" aria-label="Filtros da Fila">
        <form (ngSubmit)="carregar()" class="filtros-grid">
          <div class="form-group">
            <label class="form-label" for="filtro-status">Status</label>
            <input
              id="filtro-status"
              type="text"
              [(ngModel)]="filtroStatus"
              name="filtroStatus"
              class="form-control"
              placeholder="Ex: EmAndamento, Aguardando..."
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="filtro-mecanico">Mecânico (ID)</label>
            <input
              id="filtro-mecanico"
              type="text"
              [(ngModel)]="filtroMecanicoId"
              name="filtroMecanicoId"
              class="form-control"
              placeholder="UUID do mecânico"
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
        <div class="card-panel alerta-erro" role="alert" data-testid="erro-execucao">
          {{ mensagemErro }}
        </div>
      }

      <section class="card-panel" aria-label="Itens da Fila">
        @if (carregando()) {
          <p role="status">Carregando fila de execução...</p>
        } @else {
          <div class="lista-execucoes">
            @for (item of itens(); track item.id) {
              <div class="execucao-card" data-testid="item-fila-execucao">
                <div class="cabecalho-item">
                  <div>
                    <strong>Execução {{ item.id }}</strong>
                    <span class="detalhe"> · OS {{ item.ordemServicoId }}</span>
                  </div>
                  <span class="badge-status">{{ item.status }}</span>
                </div>

                @if (item.mecanicoId) {
                  <p class="detalhe">Mecânico: {{ item.mecanicoId }}</p>
                }

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
    .filtros-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .lista-execucoes { display: flex; flex-direction: column; gap: 1rem; }
    .execucao-card { padding: 1rem; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(15, 15, 18, 0.6); }
    .cabecalho-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .detalhe { color: #A1A1AA; font-size: 0.85rem; margin: 0.25rem 0; }
    .badge-status { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; background: rgba(237, 20, 91, 0.15); color: #ED145B; }
    .acoes-item { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 0.75rem; }
    .grupo-motivo { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; flex: 1; min-width: 240px; }
    .input-sm { padding: 0.35rem 0.65rem; font-size: 0.85rem; flex: 1; }
    .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.8rem; }
    .alerta-erro { margin-bottom: 1.25rem; border-color: rgba(239, 68, 68, 0.4); color: #F87171; }
  `]
})
export class FilaExecucaoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly execucaoService = inject(ExecucaoService);
  private readonly auth = inject(AuthService);

  filtroStatus = '';
  filtroMecanicoId = '';
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

  carregar(): void {
    this.carregando.set(true);
    this.execucaoService
      .listarFila({
        status: this.filtroStatus,
        mecanicoId: this.filtroMecanicoId,
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

  registrarEtapa(execucaoId: string, etapa: TipoEtapaExecucao): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.execucaoService
      .registrarEtapa(execucaoId, etapa)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
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
    const padrao = MENSAGENS_POR_STATUS[e.status]?.mensagem ?? 'Não foi possível executar a operação.';
    this.erro.set(mensagemDoCodigo(e.error?.codigo, e.error?.mensagem ?? padrao));
    this.enviando.set(false);
  }
}
