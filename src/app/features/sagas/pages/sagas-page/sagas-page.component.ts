import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SagaService } from '../../services/saga.service';
import { ESTADOS_SAGA, SagaDetalhe, SagaResumo } from '../../models/saga.model';
import { mensagemDoCodigo } from '../../../../core/http/error-catalog';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { DataHoraComponent } from '../../../../shared/components/data-hora/data-hora.component';
import { DrawerComponent } from '../../../../shared/components/drawer/drawer.component';
import { opcoesDeEstados } from '../../../../shared/utils/status-os.utils';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

export type AbaSaga = 'etapas' | 'comandos' | 'registros';

/** Opções do filtro "Parada há" (valor em minutos; vazio = qualquer tempo). */
export const OPCOES_PARADA: SelectOption[] = [
  { value: '', label: 'Qualquer tempo' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 h' },
  { value: '360', label: '6 h' },
  { value: '1440', label: '24 h' },
];

/** Classe do marcador da etapa na linha do tempo, conforme a situação. */
export function classeSituacaoEtapa(situacao: string): string {
  const s = (situacao ?? '').toLowerCase();
  if (s === 'concluida' || s === 'concluída') return 'sit-ok';
  if (s.includes('falh') || s.includes('compens') || s.includes('erro')) return 'sit-falha';
  if (s === 'pendente') return 'sit-pendente';
  return 'sit-andamento';
}

@Component({
  selector: 'app-sagas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageContainerComponent,
    IdBadgeComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    AlertBannerComponent,
    CustomSelectComponent,
    DataHoraComponent,
    DrawerComponent,
  ],
  template: `
    <app-page-container>
      <header class="page-header">
        <div>
          <h1 class="page-title">Console de Sagas</h1>
          <p class="page-subtitle">Estado, etapas, comandos e retentativa da reserva de insumos</p>
        </div>
      </header>

      <section class="filter-bar" aria-label="Filtros de Sagas">
        <div class="form-group">
          <label class="form-label" for="filtroEstado">Estado</label>
          <app-custom-select
            idGatilho="filtroEstado"
            [options]="opcoesEstados"
            [value]="filtroEstado()"
            [permitirVazio]="false"
            placeholder="Todos os estados"
            (valueChange)="filtroEstado.set($event)"
            data-testid="filtro-estado"
          ></app-custom-select>
        </div>

        <div class="form-group">
          <label class="form-label" for="filtroParada">Parada há</label>
          <app-custom-select
            idGatilho="filtroParada"
            [options]="opcoesParada"
            [value]="filtroParadaTexto()"
            [permitirVazio]="false"
            [searchable]="false"
            placeholder="Qualquer tempo"
            (valueChange)="escolherParada($event)"
            data-testid="filtro-parada"
          ></app-custom-select>
        </div>

        <div class="filter-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="carregar()"
            [disabled]="carregando()"
            data-testid="btn-filtrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Atualizar
          </button>
        </div>
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

      <div class="data-table-container">
        @if (carregando()) {
          <div class="loading-box">
            <app-loading-spinner message="Carregando sagas..."></app-loading-spinner>
          </div>
        } @else if (sagas().length === 0) {
          <p class="empty-state">Nenhuma saga encontrada para o filtro informado.</p>
        } @else {
          <table class="data-table" data-testid="tabela-sagas">
            <thead>
              <tr>
                <th>OS</th>
                <th>Estado</th>
                <th>Atualizada</th>
                <th class="col-acoes"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (item of sagas(); track item.ordemServicoId) {
                <tr
                  [class.linha-selecionada]="detalhe()?.ordemServicoId === item.ordemServicoId"
                  [attr.data-testid]="'linha-saga-' + item.ordemServicoId"
                >
                  <td><app-id-badge [text]="item.ordemServicoId" size="sm"></app-id-badge></td>
                  <td><app-status-badge [status]="item.estado" size="sm"></app-status-badge></td>
                  <td><app-data-hora [valor]="item.atualizadoEm" modo="relativo"></app-data-hora></td>
                  <td class="col-acoes">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="selecionar(item.ordemServicoId)"
                      [attr.data-testid]="'ver-saga-' + item.ordemServicoId"
                    >
                      Detalhes ›
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <app-drawer [isOpen]="!!detalhe()" width="560px" (closed)="fecharDetalhe()">
        <div drawer-header>
          @if (detalhe(); as d) {
          <div class="drawer-cabecalho" data-testid="detalhe-saga">
            <div class="drawer-titulo">
              <div class="drawer-linha">
                <span class="text-subtle rotulo">OS</span>
                <app-id-badge [text]="d.ordemServicoId"></app-id-badge>
                <span data-testid="detalhe-estado">
                  <app-status-badge [status]="d.estado" size="sm"></app-status-badge>
                </span>
              </div>
              <div class="drawer-linha drawer-meta">
                @if (d.orcamentoId) {
                  <span class="text-subtle rotulo">Orçamento</span>
                  <app-id-badge [text]="d.orcamentoId" size="sm"></app-id-badge>
                }
                <span class="text-subtle rotulo">Atualizada</span>
                <app-data-hora [valor]="d.atualizadoEm" modo="relativo"></app-data-hora>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              aria-label="Fechar"
              (click)="fecharDetalhe()"
              data-testid="btn-fechar-detalhe"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          }
        </div>

        <div drawer-body>
          @if (detalhe(); as d) {
          <div class="drawer-corpo">
            @if (d.estado === 'AguardandoInsumos') {
              <div class="bloco-retentativa" data-testid="bloco-retentativa">
                <label class="form-label" for="motivoRetentativa">Retentar reserva de insumos</label>
                <div class="retentativa-linha">
                  <input
                    id="motivoRetentativa"
                    name="motivoRetentativa"
                    type="text"
                    class="form-control campo-motivo"
                    [ngModel]="motivoRetentativa()"
                    (ngModelChange)="motivoRetentativa.set($event)"
                    placeholder="Motivo (ex.: saldo reposto)"
                    data-testid="motivo-retentativa"
                  />
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="!motivoValido() || enviando()"
                    (click)="retentar()"
                    data-testid="btn-retentar"
                  >
                    Retentar
                  </button>
                </div>
              </div>
            }

            <div class="abas" role="tablist" aria-label="Detalhe da Saga">
              <button type="button" role="tab" class="aba" [class.ativa]="aba() === 'etapas'"
                [attr.aria-selected]="aba() === 'etapas'" (click)="aba.set('etapas')" data-testid="aba-etapas">
                Etapas <span class="contagem">{{ d.etapas.length }}</span>
              </button>
              <button type="button" role="tab" class="aba" [class.ativa]="aba() === 'comandos'"
                [attr.aria-selected]="aba() === 'comandos'" (click)="aba.set('comandos')" data-testid="aba-comandos">
                Comandos <span class="contagem">{{ d.comandos.length }}</span>
              </button>
              <button type="button" role="tab" class="aba" [class.ativa]="aba() === 'registros'"
                [attr.aria-selected]="aba() === 'registros'" (click)="aba.set('registros')" data-testid="aba-registros">
                Registros <span class="contagem">{{ d.registros.length }}</span>
              </button>
            </div>

            @switch (aba()) {
              @case ('etapas') {
                <ol class="linha-tempo" role="tabpanel" data-testid="lista-etapas">
                  @for (etapa of d.etapas; track etapa.numero) {
                    <li class="evento">
                      <span class="marcador" [class]="'marcador ' + classeSituacao(etapa.situacao)" aria-hidden="true"></span>
                      <div class="evento-conteudo">
                        <div class="evento-linha">
                          <span class="text-subtle mono">#{{ etapa.numero }}</span>
                          <strong>{{ etapa.nome }}</strong>
                          <span class="chip" [class]="'chip ' + classeSituacao(etapa.situacao)">{{ etapa.situacao }}</span>
                        </div>
                        @if (etapa.erroCompensacao) {
                          <p class="text-danger evento-detalhe">{{ etapa.erroCompensacao }}</p>
                        }
                      </div>
                    </li>
                  } @empty {
                    <li class="empty-state">Nenhuma etapa registrada.</li>
                  }
                </ol>
              }
              @case ('comandos') {
                <ul class="lista-cartoes" role="tabpanel" data-testid="lista-comandos">
                  @for (cmd of d.comandos; track $index) {
                    <li class="cartao">
                      <div class="evento-linha">
                        <span class="mono">{{ cmd.tipo }}</span>
                        <span class="chip">{{ cmd.tentativas }} {{ cmd.tentativas === 1 ? 'tentativa' : 'tentativas' }}</span>
                      </div>
                      <div class="evento-linha text-muted">
                        <span>→ {{ cmd.destino }}</span>
                        @if (cmd.enviadoEm) {
                          <span>· enviado <app-data-hora [valor]="cmd.enviadoEm" modo="relativo"></app-data-hora></span>
                        }
                      </div>
                      @if (cmd.ultimoErro) {
                        <p class="text-danger evento-detalhe">{{ cmd.ultimoErro }}</p>
                      }
                    </li>
                  } @empty {
                    <li class="empty-state">Nenhum comando enviado.</li>
                  }
                </ul>
              }
              @case ('registros') {
                <ol class="linha-tempo" role="tabpanel" data-testid="lista-registros">
                  @for (reg of d.registros; track $index) {
                    <li class="evento">
                      <span class="marcador sit-andamento" aria-hidden="true"></span>
                      <div class="evento-conteudo">
                        <div class="evento-linha">
                          <app-data-hora [valor]="reg.em" modo="curto"></app-data-hora>
                          <span class="mono">{{ reg.evento }}</span>
                        </div>
                        <p class="evento-detalhe text-muted">{{ reg.descricao }}</p>
                      </div>
                    </li>
                  } @empty {
                    <li class="empty-state">Nenhum registro.</li>
                  }
                </ol>
              }
            }
          </div>
          }
        </div>
      </app-drawer>
    </app-page-container>
  `,
  styles: [`
    .loading-box { padding: 2rem 0; display: flex; justify-content: center; }
    .data-table tbody tr.linha-selecionada { background: var(--primary-subtle); }
    .drawer-cabecalho { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.1rem 1.25rem; }
    .drawer-titulo { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
    .drawer-linha { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .drawer-meta { font-size: 0.85rem; }
    .rotulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .drawer-corpo { padding: 1rem 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .bloco-retentativa { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.75rem; border: 1px solid var(--warning); border-radius: var(--radius-sm); background: var(--warning-bg); }
    .retentativa-linha { display: flex; gap: 0.5rem; }
    .campo-motivo { flex: 1; }
    .abas { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--border-color); }
    .aba { background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); padding: 0.55rem 0.85rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }
    .aba:hover { color: var(--text-main); }
    .aba.ativa { color: var(--text-main); border-bottom-color: var(--primary); }
    .contagem { font-size: 0.72rem; background: var(--mono-badge-bg); border-radius: var(--radius-full); padding: 0.05rem 0.45rem; }
    .linha-tempo, .lista-cartoes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .lista-cartoes { gap: 0.6rem; }
    .evento { position: relative; display: flex; gap: 0.75rem; padding: 0 0 1rem 0; }
    .evento:not(:last-child)::before { content: ''; position: absolute; left: 5px; top: 14px; bottom: 0; width: 2px; background: var(--border-color); }
    .marcador { flex-shrink: 0; width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; background: var(--text-subtle); }
    .marcador.sit-ok { background: var(--success); }
    .marcador.sit-pendente { background: var(--text-subtle); }
    .marcador.sit-falha { background: var(--danger); }
    .marcador.sit-andamento { background: var(--info); }
    .evento-conteudo { min-width: 0; flex: 1; }
    .evento-linha { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.875rem; }
    .evento-detalhe { margin: 0.25rem 0 0; font-size: 0.85rem; }
    .chip { font-size: 0.72rem; font-weight: 600; padding: 0.1rem 0.5rem; border-radius: var(--radius-full); background: var(--mono-badge-bg); color: var(--text-muted); }
    .chip.sit-ok { background: var(--success-bg); color: var(--success); }
    .chip.sit-falha { background: var(--danger-bg); color: var(--danger); }
    .chip.sit-andamento { background: var(--info-bg); color: var(--info); }
    .cartao { padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-card); display: flex; flex-direction: column; gap: 0.3rem; }
    .cartao .mono { word-break: break-all; }
  `],
})
export class SagasPageComponent implements OnInit {
  private readonly sagaService = inject(SagaService);
  private readonly osJornadaStore = inject(OsJornadaStore);

  readonly estados = ESTADOS_SAGA;
  readonly opcoesEstados: SelectOption[] = opcoesDeEstados(ESTADOS_SAGA);
  readonly opcoesParada = OPCOES_PARADA;
  readonly classeSituacao = classeSituacaoEtapa;
  sagas = signal<SagaResumo[]>([]);
  detalhe = signal<SagaDetalhe | null>(null);
  carregando = signal(false);
  enviando = signal(false);
  erro = signal<string | null>(null);
  mensagemSucesso = signal<string | null>(null);

  filtroEstado = signal('');
  filtroParada = signal<number | null>(null);
  motivoRetentativa = signal('');
  aba = signal<AbaSaga>('etapas');

  ngOnInit(): void {
    this.carregar();
  }

  filtroParadaTexto(): string {
    const valor = this.filtroParada();
    return valor === null || valor === undefined ? '' : String(valor);
  }

  escolherParada(valor: string): void {
    const minutos = Number(valor);
    this.filtroParada.set(valor && Number.isFinite(minutos) ? minutos : null);
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
    this.aba.set('etapas');
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

  fecharDetalhe(): void {
    this.detalhe.set(null);
    this.motivoRetentativa.set('');
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
