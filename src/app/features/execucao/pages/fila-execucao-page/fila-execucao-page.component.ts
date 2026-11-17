import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ExecucaoService } from '../../services/execucao.service';
import { ESTADOS_EXECUCAO, ItemFilaExecucao, TipoEtapaExecucao } from '../../models/execucao.model';
import { AuthService } from '../../../auth/services/auth.service';
import { Veiculo } from '../../../veiculos/models/veiculo.model';
import { OsConhecidasService, formatarPlaca } from '../../../ordens-servico/services/os-conhecidas.service';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo, extrairCodigoErro, extrairDetalheErro } from '../../../../core/http/error-catalog';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PlacaBadgeComponent } from '../../../../shared/components/placa-badge/placa-badge.component';
import { DataHoraComponent } from '../../../../shared/components/data-hora/data-hora.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';
import { opcoesDeEstados } from '../../../../shared/utils/status-os.utils';

/** Rótulo pt-BR do tipo de etapa. */
export function rotuloTipoEtapa(tipo: string): string {
  const rotulos: Record<string, string> = { Diagnostico: 'Diagnóstico', Reparo: 'Reparo' };
  return rotulos[tipo] ?? tipo;
}

/** Ações que a Execução aceita em cada estado (espelha `OrdemExecucao` do serviço Execução). */
export function acoesDoEstado(status: string): { etapas: boolean; concluir: boolean; falha: boolean; reexecutar: boolean } {
  const ativa = status === 'Fila' || status === 'EmExecucao';
  return {
    etapas: ativa,
    concluir: status === 'EmExecucao',
    falha: ativa,
    reexecutar: status === 'Falhou',
  };
}

@Component({
  selector: 'app-fila-execucao-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageContainerComponent,
    IdBadgeComponent,
    StatusBadgeComponent,
    PlacaBadgeComponent,
    DataHoraComponent,
    CustomSelectComponent,
    AlertBannerComponent
  ],
  template: `
    <app-page-container>
      <header class="page-header">
        <div>
          <h1 class="page-title">Fila de Execução</h1>
          <p class="page-subtitle">Registre etapas de diagnóstico e reparo, conclua ou reporte falha.</p>
        </div>
      </header>

      <form class="filter-bar" (ngSubmit)="carregar()" aria-label="Filtros da Fila">
        <div class="form-group">
          <label class="form-label" for="filtro-status">Status</label>
          <app-custom-select
            idGatilho="filtro-status"
            [options]="statusOptions"
            [value]="filtroStatus"
            [permitirVazio]="false"
            (valueChange)="filtroStatus = $event"
            placeholder="Todos os estados"
            data-testid="filtro-status"
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
            placeholder="Responsável ou mecânico"
            data-testid="filtro-mecanico"
          />
        </div>

        <div class="filter-actions">
          <button type="submit" class="btn btn-secondary" data-testid="btn-filtrar-fila" [disabled]="carregando()">
            Filtrar
          </button>
        </div>
      </form>

      @if (erro(); as mensagemErro) {
        <div data-testid="erro-execucao">
          <app-alert-banner tipo="erro">{{ mensagemErro }}</app-alert-banner>
        </div>
      }

      @if (carregando()) {
        <p role="status" class="empty-state">Carregando fila de execução...</p>
      } @else {
        <div class="lista-execucoes">
          @for (item of itens(); track item.id) {
            @let veiculo = veiculoDe(item);
            @let acoes = acoesDe(item.status);
            <article class="execucao-card" data-testid="item-fila-execucao">
              <header class="cabecalho-item">
                <div class="identidade" data-testid="identidade-execucao">
                  @if (veiculo?.placa) {
                    <app-placa-badge [placa]="placa(veiculo!.placa)" size="md"></app-placa-badge>
                    <span class="veiculo-nome" data-testid="veiculo-execucao">
                      {{ veiculo!.modelo }}@if (veiculo!.marca) {<span class="text-muted"> · {{ veiculo!.marca }}</span>}
                    </span>
                  } @else {
                    <span class="text-subtle rotulo">OS</span>
                    <app-id-badge [text]="item.ordemServicoId" size="md"></app-id-badge>
                  }
                </div>
                <div class="status-container">
                  @if (item.intervencaoRequerida) {
                    <span class="badge-intervencao" data-testid="badge-intervencao">Intervenção requerida</span>
                  }
                  <app-status-badge [status]="item.status" size="sm"></app-status-badge>
                </div>
              </header>

              <div class="meta-item">
                @if (veiculo?.placa) {
                  <span class="text-subtle rotulo">OS</span>
                  <app-id-badge [text]="item.ordemServicoId" size="sm"></app-id-badge>
                }
                <span class="text-subtle rotulo">Execução</span>
                <app-id-badge [text]="item.id" size="sm"></app-id-badge>
                @if (item.atualizadaEm) {
                  <span class="text-subtle">· atualizada <app-data-hora [valor]="item.atualizadaEm" modo="relativo"></app-data-hora></span>
                }
              </div>

              @if (item.motivoFalha) {
                <div class="falha-box" data-testid="motivo-falha">
                  <strong>Motivo da falha:</strong> {{ item.motivoFalha }}
                </div>
              }

              @if (item.etapas && item.etapas.length > 0) {
                <ol class="linha-tempo" data-testid="historico-etapas" aria-label="Etapas registradas">
                  @for (et of item.etapas; track et.sequencia) {
                    <li class="etapa-item" data-testid="etapa-execucao">
                      <span class="marcador" aria-hidden="true"></span>
                      <div class="etapa-conteudo">
                        <div class="etapa-linha">
                          <span class="chip-tipo" data-testid="etapa-tipo">{{ rotuloTipo(et.tipo) }}</span>
                          <span>{{ et.descricao }}</span>
                          @if (ehDescricaoAutomatica(et.descricao)) {
                            <span class="badge-auto" data-testid="badge-descricao-automatica">(descrição automática)</span>
                          }
                        </div>
                        <div class="etapa-meta text-subtle">
                          @if (et.responsavel) {
                            <span data-testid="etapa-responsavel">por {{ et.responsavel }}</span>
                          }
                          @if (et.registradaEm) {
                            <app-data-hora [valor]="et.registradaEm" modo="curto"></app-data-hora>
                          }
                        </div>
                      </div>
                    </li>
                  }
                </ol>
              }

              @if (acoes.etapas) {
                <div class="etapa-input-container">
                  <label class="form-label" [for]="'desc-' + item.id">Descrição da etapa</label>
                  <div class="input-with-hint">
                    <input
                      [id]="'desc-' + item.id"
                      type="text"
                      class="form-control"
                      [(ngModel)]="descricoes[item.id]"
                      [name]="'desc-' + item.id"
                      placeholder="Descreva a etapa (opcional)"
                    />
                    @if (!descricoes[item.id]?.trim()) {
                      <span class="hint-auto" data-testid="hint-auto-descricao">Automática ao registrar</span>
                    }
                  </div>
                </div>
              }

              @if (acoes.etapas || acoes.concluir || acoes.falha) {
                <div class="acoes-item">
                  @if (acoes.etapas) {
                    <button type="button" class="btn btn-secondary btn-sm" data-testid="btn-etapa-diagnostico"
                      [disabled]="enviando()" (click)="registrarEtapa(item.id, 'Diagnostico')">
                      Registrar diagnóstico
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" data-testid="btn-etapa-reparo"
                      [disabled]="enviando()" (click)="registrarEtapa(item.id, 'Reparo')">
                      Registrar reparo
                    </button>
                  }
                  @if (acoes.concluir) {
                    <button type="button" class="btn btn-success btn-sm" data-testid="btn-concluir-execucao"
                      [disabled]="enviando()" (click)="concluir(item.id)">
                      Concluir
                    </button>
                  }
                  @if (acoes.falha && falhaAberta() !== item.id) {
                    <button type="button" class="btn btn-ghost btn-danger btn-sm acao-falha" data-testid="btn-reportar-falha"
                      [disabled]="enviando()" (click)="abrirFalha(item.id)">
                      Reportar falha
                    </button>
                  }
                </div>
              }

              @if (acoes.falha && falhaAberta() === item.id) {
                <div class="grupo-motivo" data-testid="grupo-falha">
                  <label class="sr-only" [for]="'motivo-' + item.id">Motivo da falha</label>
                  <input
                    [id]="'motivo-' + item.id"
                    type="text"
                    class="form-control campo-motivo"
                    [(ngModel)]="motivos[item.id]"
                    [name]="'motivo-' + item.id"
                    placeholder="Motivo da falha"
                    data-testid="motivo-falha-input"
                  />
                  <button type="button" class="btn btn-danger btn-sm" data-testid="btn-falha-execucao"
                    [disabled]="!motivoPreenchido(item.id) || enviando()" (click)="marcarFalha(item.id, motivos[item.id])">
                    Confirmar falha
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" data-testid="btn-cancelar-falha" (click)="fecharFalha()">
                    Cancelar
                  </button>
                </div>
              }

              @if (acoes.reexecutar && ehAdministrador()) {
                <div class="grupo-motivo">
                  <label class="sr-only" [for]="'reexec-' + item.id">Motivo da reexecução</label>
                  <input
                    [id]="'reexec-' + item.id"
                    type="text"
                    class="form-control campo-motivo"
                    [(ngModel)]="motivos[item.id]"
                    [name]="'reexec-' + item.id"
                    placeholder="Motivo da reexecução"
                    data-testid="motivo-reexecucao-input"
                  />
                  <button type="button" class="btn btn-secondary btn-sm" data-testid="btn-reexecutar-execucao"
                    [disabled]="!motivoPreenchido(item.id) || enviando()" (click)="reexecutar(item.id, motivos[item.id])">
                    Reexecutar
                  </button>
                </div>
              }
            </article>
          } @empty {
            <p class="empty-state">Nenhuma execução na fila.</p>
          }
        </div>
      }
    </app-page-container>
  `,
  styles: [`
    .lista-execucoes { display: flex; flex-direction: column; gap: 1rem; }
    .execucao-card { padding: 1.1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 0.75rem; }
    .cabecalho-item { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .identidade { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .veiculo-nome { font-weight: 600; font-size: 1rem; }
    .meta-item { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; font-size: 0.82rem; }
    .rotulo { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-container { display: flex; align-items: center; gap: 0.5rem; }
    .badge-intervencao { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning); border-radius: var(--radius-full); padding: 0.15rem 0.6rem; font-size: 0.72rem; font-weight: 600; }
    .falha-box { background: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; color: var(--danger); font-size: 0.85rem; }
    .linha-tempo { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .etapa-item { position: relative; display: flex; gap: 0.65rem; padding-bottom: 0.65rem; }
    .etapa-item:not(:last-child)::before { content: ''; position: absolute; left: 4px; top: 12px; bottom: 0; width: 2px; background: var(--border-color); }
    .marcador { flex-shrink: 0; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; background: var(--info); }
    .etapa-conteudo { min-width: 0; flex: 1; }
    .etapa-linha { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.85rem; }
    .etapa-meta { display: flex; gap: 0.5rem; font-size: 0.75rem; margin-top: 0.15rem; }
    .chip-tipo { font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: var(--radius-full); background: var(--info-bg); color: var(--info); }
    .badge-auto { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
    .etapa-input-container { display: flex; flex-direction: column; gap: 0.3rem; }
    .input-with-hint { position: relative; display: flex; align-items: center; }
    .input-with-hint input { padding-right: 11rem; }
    .hint-auto { position: absolute; right: 0.75rem; font-size: 0.75rem; color: var(--info); font-style: italic; pointer-events: none; }
    .acoes-item { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .acao-falha { margin-left: auto; }
    .grupo-motivo { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .campo-motivo { flex: 1; min-width: 200px; }
  `]
})
export class FilaExecucaoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly execucaoService = inject(ExecucaoService);
  private readonly auth = inject(AuthService);
  private readonly osConhecidas = inject(OsConhecidasService);

  readonly statusOptions: SelectOption[] = opcoesDeEstados(ESTADOS_EXECUCAO);
  readonly rotuloTipo = rotuloTipoEtapa;
  readonly acoesDe = acoesDoEstado;
  readonly placa = formatarPlaca;

  filtroStatus = '';
  filtroMecanico = '';
  descricoes: Record<string, string> = {};
  motivos: Record<string, string> = {};

  readonly itens = signal<ItemFilaExecucao[]>([]);
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  /** Veículos já resolvidos, por `veiculoId` (`null` quando a consulta falhou). */
  readonly veiculos = signal<Record<string, Veiculo | null>>({});
  /** Execução com o campo de motivo da falha aberto. */
  readonly falhaAberta = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  ehAdministrador(): boolean {
    return this.auth.hasRole(['Administrador']);
  }

  veiculoDe(item: ItemFilaExecucao): Veiculo | null {
    return item.veiculoId ? this.veiculos()[item.veiculoId] ?? null : null;
  }

  motivoPreenchido(execucaoId: string): boolean {
    return !!this.motivos[execucaoId]?.trim();
  }

  abrirFalha(execucaoId: string): void {
    this.falhaAberta.set(execucaoId);
  }

  fecharFalha(): void {
    this.falhaAberta.set(null);
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
          this.carregarVeiculos(lista);
        },
        error: () => {
          this.carregando.set(false);
        },
      });
  }

  private carregarVeiculos(lista: ItemFilaExecucao[]): void {
    const ids = new Set(lista.map(i => i.veiculoId).filter((id): id is string => !!id));
    for (const id of ids) {
      if (id in this.veiculos()) continue;
      this.osConhecidas
        .veiculo(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(v => this.veiculos.update(atual => ({ ...atual, [id]: v })));
    }
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
          this.falhaAberta.set(null);
          this.motivos[execucaoId] = '';
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
          this.motivos[execucaoId] = '';
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
