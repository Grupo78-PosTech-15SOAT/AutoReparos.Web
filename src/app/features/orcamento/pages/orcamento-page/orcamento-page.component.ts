import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrcamentoService } from '../../services/orcamento.service';
import { ServicoService } from '../../../servicos/services/servico.service';
import { InsumoService } from '../../../insumos/services/insumo.service';
import { Servico } from '../../../servicos/models/servico.model';
import { Insumo } from '../../../insumos/models/insumo.model';
import { ItemOrcamento, OrcamentoCriadoResponse, agruparItensOrcamento } from '../../models/orcamento.model';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { IdBadgeComponent, idCurto } from '../../../../shared/components/id-badge/id-badge.component';
import { PlacaBadgeComponent } from '../../../../shared/components/placa-badge/placa-badge.component';
import { DocumentoBadgeComponent } from '../../../../shared/components/documento-badge/documento-badge.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';
import { MoedaPipe } from '../../../../shared/pipes/moeda.pipe';
import { CpfCnpjPipe } from '../../../../shared/pipes/cpf-cnpj.pipe';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';
import {
  OsConhecidasService,
  OsEnriquecida,
  formatarPlaca,
  opcaoDeOs,
  ordenarParaOrcamento,
} from '../../../ordens-servico/services/os-conhecidas.service';

/** UUID completo (formato GUID), para aceitar o código colado de uma OS fora da lista. */
const REGEX_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MENSAGEM_OS_NAO_ENCONTRADA = 'OS não encontrada para o código informado.';

@Component({
  selector: 'app-orcamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    PageContainerComponent,
    CustomSelectComponent,
    IdBadgeComponent,
    PlacaBadgeComponent,
    DocumentoBadgeComponent,
    AlertBannerComponent,
    MoedaPipe,
    CpfCnpjPipe,
  ],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">Montar Orçamento</h1>
          <p class="page-subtitle">Escolha a OS, selecione serviços e insumos do catálogo da Execução ou informe valor avulso.</p>
        </div>
      </div>

      <section class="card-panel bloco" aria-label="Ordem de Serviço">
        <div class="form-group">
          <label class="form-label" for="orc-seletor-os">Ordem de Serviço</label>
          <app-custom-select
            data-testid="seletor-os"
            idGatilho="orc-seletor-os"
            [options]="osOptions()"
            [value]="ordemServicoId()"
            [loading]="carregandoOs() || resolvendoOs()"
            [buscaSempre]="true"
            [permitirVazio]="false"
            placeholder="Selecione a OS"
            placeholderBusca="Código, placa, modelo ou cliente"
            textoVazio="Nenhuma OS encontrada. Cole o código completo da OS."
            (buscaMudou)="buscaOs.set($event)"
            (valueChange)="selecionarOs($event)"
          ></app-custom-select>
        </div>

        @if (erroOs(); as mensagem) {
          <div data-testid="erro-os" class="bloco-erro">
            <app-alert-banner tipo="erro" [mensagem]="mensagem"></app-alert-banner>
          </div>
        }

        @if (osSelecionada(); as os) {
          <div class="resumo-os" data-testid="resumo-os">
            <div class="resumo-item">
              <span class="resumo-rotulo">Cliente</span>
              <div class="resumo-valor">
                @if (os.clienteNome) {
                  <strong data-testid="resumo-cliente">{{ os.clienteNome }}</strong>
                  @if (os.clienteDocumento) {
                    <app-documento-badge [documento]="os.clienteDocumento | cpfCnpj" size="sm"></app-documento-badge>
                  }
                } @else if (clienteId()) {
                  <app-id-badge [text]="clienteId()" size="sm"></app-id-badge>
                } @else {
                  <span class="text-danger">Cliente da OS não identificado</span>
                }
              </div>
            </div>
            <div class="resumo-item">
              <span class="resumo-rotulo">Veículo</span>
              <div class="resumo-valor">
                @if (os.placa) {
                  <app-placa-badge [placa]="formatarPlaca(os.placa)" size="sm"></app-placa-badge>
                  <span data-testid="resumo-modelo">{{ os.modelo }}@if (os.marca) { ({{ os.marca }})}</span>
                } @else if (os.veiculoId) {
                  <app-id-badge [text]="os.veiculoId" size="sm"></app-id-badge>
                } @else {
                  <span class="text-muted">Veículo não identificado</span>
                }
              </div>
            </div>
            <div class="resumo-item">
              <span class="resumo-rotulo">OS</span>
              <div class="resumo-valor">
                <app-id-badge [text]="os.id" size="sm"></app-id-badge>
              </div>
            </div>
          </div>
        }

        <div class="modo-selector" role="group" aria-label="Modo do orçamento">
          <button
            type="button"
            class="modo-opcao"
            data-testid="modo-itens"
            [class.ativo]="modo() === 'itens'"
            [attr.aria-pressed]="modo() === 'itens'"
            (click)="modo.set('itens')"
          >
            Itens do catálogo
          </button>
          <button
            type="button"
            class="modo-opcao"
            data-testid="modo-avulso"
            [class.ativo]="modo() === 'avulso'"
            [attr.aria-pressed]="modo() === 'avulso'"
            (click)="modo.set('avulso')"
          >
            Valor avulso
          </button>
        </div>
      </section>

      @if (modo() === 'itens') {
        <div class="grid-2 bloco">
          <section class="card-panel" aria-label="Catálogo de Serviços">
            <h3 class="secao">Serviços</h3>
            <ul class="lista lista-rolavel">
              @for (s of servicos(); track s.id ?? s.nome) {
                <li class="linha" data-testid="catalogo-servico">
                  <div>
                    <strong>{{ s.nome }}</strong>
                    <span class="detalhe"> — {{ (s.precoUnitario ?? s.precoBase ?? s.valorTabelado ?? 0) | moeda }}</span>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="adicionarServico(s)">
                    + Adicionar
                  </button>
                </li>
              } @empty {
                <li class="linha text-muted">Nenhum serviço disponível.</li>
              }
            </ul>
          </section>

          <section class="card-panel" aria-label="Catálogo de Insumos">
            <h3 class="secao">Insumos</h3>
            <ul class="lista lista-rolavel">
              @for (i of insumos(); track i.id ?? i.nome) {
                <li class="linha" data-testid="catalogo-insumo">
                  <div>
                    <strong>{{ i.nome }}</strong>
                    <span class="detalhe">
                      — {{ (i.precoUnitario ?? i.valor ?? 0) | moeda }}
                      (Saldo: {{ i.quantidadeDisponivel ?? i.saldoDisponivel ?? i.quantidadeEstoque ?? 0 }})
                    </span>
                  </div>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="adicionarInsumo(i)">
                    + Adicionar
                  </button>
                </li>
              } @empty {
                <li class="linha text-muted">Nenhum insumo disponível.</li>
              }
            </ul>
          </section>
        </div>

        <section class="card-panel" aria-label="Itens do Orçamento">
          <h3 class="secao">Itens Selecionados</h3>
          <ul class="lista">
            @for (item of itens(); track $index) {
              <li class="linha" data-testid="item-orcamento">
                <div class="item-info">
                  <span>{{ item.nome }} <span class="text-muted">({{ item.tipo }})</span></span>
                  <label class="sr-only" [attr.for]="'qtd-' + $index">Quantidade de {{ item.nome }}</label>
                  <input
                    [id]="'qtd-' + $index"
                    type="number"
                    min="1"
                    [ngModel]="item.quantidade"
                    (ngModelChange)="atualizarQuantidade($index, $event)"
                    class="form-control input-qtd"
                  />
                </div>
                <div class="item-info">
                  <strong data-testid="subtotal-item">{{ item.subtotal | moeda }}</strong>
                  <button
                    type="button"
                    class="btn btn-ghost btn-danger btn-icon btn-sm"
                    [attr.aria-label]="'Remover ' + item.nome"
                    [title]="'Remover ' + item.nome"
                    (click)="removerItem($index)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </li>
            } @empty {
              <li class="linha text-muted">Adicione serviços ou insumos para compor o orçamento.</li>
            }
          </ul>

          <div class="rodape-total">
            <div data-testid="total-orcamento">
              Total calculado: <strong>{{ total() | moeda }}</strong>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              data-testid="btn-enviar-orcamento"
              [disabled]="enviando() || !podeEnviar() || itens().length === 0"
              (click)="enviar()"
            >
              {{ enviando() ? 'Enviando...' : 'Enviar Orçamento' }}
            </button>
          </div>
        </section>
      } @else {
        <section class="card-panel" aria-label="Valor Avulso">
          <h3 class="secao">Valor do Orçamento</h3>
          <div class="form-group" style="max-width: 320px;">
            <label class="form-label" for="orc-valor-avulso">Valor Total (R$)</label>
            <input
              id="orc-valor-avulso"
              type="number"
              step="0.01"
              min="0.01"
              [(ngModel)]="valorAvulso"
              name="valorAvulso"
              class="form-control"
              data-testid="input-valor-avulso"
            />
          </div>

          <div class="rodape-total">
            <span class="text-muted">Sem itens: o valor informado é o total do orçamento.</span>
            <button
              type="button"
              class="btn btn-primary"
              data-testid="btn-enviar-orcamento"
              [disabled]="enviando() || !podeEnviar() || valorAvulso <= 0"
              (click)="enviar()"
            >
              {{ enviando() ? 'Enviando...' : 'Enviar Orçamento Avulso' }}
            </button>
          </div>
        </section>
      }

      @if (orcamentoCriado(); as criado) {
        <div class="resultado-criado" role="status" data-testid="orcamento-criado">
          <p>Orçamento criado: <app-id-badge [text]="criado.id"></app-id-badge></p>
          <p>Status: <strong>{{ criado.status }}</strong></p>
          <p>Valor: <strong data-testid="valor-criado">{{ criado.valor | moeda }}</strong></p>
          <a
            class="btn btn-secondary"
            routerLink="/aprovar-orcamento"
            [queryParams]="{ orcamentoId: criado.id }"
            data-testid="link-aprovacao"
          >
            Abrir aprovação do cliente
          </a>
        </div>
      }
    </app-page-container>
  `,
  styles: [`
    .bloco { margin-bottom: 1.25rem; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .secao { font-family: var(--font-display); font-size: 1.05rem; color: var(--primary); margin-bottom: 0.75rem; }
    .lista { list-style: none; margin: 0; padding: 0; }
    .lista-rolavel { max-height: 320px; overflow-y: auto; overscroll-behavior: contain; padding-right: 0.25rem; }
    .linha { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); }
    .detalhe { color: var(--text-muted); font-size: 0.85rem; }
    .item-info { display: flex; align-items: center; gap: 0.75rem; }
    .input-qtd { width: 4.5rem; min-height: 2.25rem; padding: 0.25rem 0.5rem; text-align: center; }
    .rodape-total { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
    .bloco-erro { margin-bottom: 1rem; }
    .resumo-os {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem 1.25rem;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
    }
    .resumo-item { display: flex; flex-direction: column; gap: 0.3rem; }
    .resumo-rotulo { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-subtle); }
    .resumo-valor { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .modo-selector {
      display: inline-flex;
      padding: 0.25rem;
      gap: 0.25rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
    }
    .modo-opcao {
      border: none;
      background: transparent;
      color: var(--text-muted);
      font: inherit;
      font-size: 0.875rem;
      padding: 0.45rem 0.9rem;
      border-radius: calc(var(--radius-sm) - 2px);
      cursor: pointer;
    }
    .modo-opcao:hover { color: var(--text-main); }
    .modo-opcao.ativo { background: var(--primary-subtle); color: var(--text-main); font-weight: 600; }
    .modo-opcao:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
    .resultado-criado {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: var(--radius-md);
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .resultado-criado p { margin: 0; display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class OrcamentoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly servicoService = inject(ServicoService);
  private readonly insumoService = inject(InsumoService);
  private readonly orcamentoService = inject(OrcamentoService);
  private readonly osJornadaStore = inject(OsJornadaStore);
  private readonly osConhecidas = inject(OsConhecidasService);

  valorAvulso = 0;
  readonly formatarPlaca = formatarPlaca;

  readonly modo = signal<'itens' | 'avulso'>('itens');
  readonly servicos = signal<Servico[]>([]);
  readonly insumos = signal<Insumo[]>([]);
  readonly itens = signal<ItemOrcamento[]>([]);
  readonly enviando = signal(false);
  readonly orcamentoCriado = signal<OrcamentoCriadoResponse | null>(null);

  /** OS conhecidas (atalho local, Sagas e fila), já com placa, modelo e cliente. */
  readonly osLista = signal<OsEnriquecida[]>([]);
  readonly carregandoOs = signal(true);
  readonly resolvendoOs = signal(false);
  readonly buscaOs = signal('');
  readonly erroOs = signal<string | null>(null);
  readonly osSelecionada = signal<OsEnriquecida | null>(null);
  readonly clienteId = signal('');

  readonly ordemServicoId = computed(() => this.osSelecionada()?.id ?? '');
  readonly podeEnviar = computed(() => !!this.ordemServicoId() && !!this.clienteId().trim());

  /** `clienteId` vindo da query, usado quando a OS não traz o cliente. */
  private clienteIdDaRota = '';

  readonly osOptions = computed<SelectOption[]>(() => {
    const lista = ordenarParaOrcamento(this.osLista());
    const opcoes = lista.map(opcaoDeOs);
    const colado = this.buscaOs().trim();
    if (REGEX_GUID.test(colado) && !lista.some(os => os.id.toLowerCase() === colado.toLowerCase())) {
      opcoes.unshift({
        value: colado,
        label: `Usar OS ${idCurto(colado)}`,
        descricao: 'Carregar a OS pelo código colado',
        palavrasChave: colado,
      });
    }
    return opcoes;
  });

  readonly total = computed(() =>
    this.itens().reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0)
  );

  ngOnInit(): void {
    const paramId = this.route.snapshot?.paramMap?.get('id');
    const queryOsId = this.route.snapshot?.queryParamMap?.get('ordemServicoId');
    this.clienteIdDaRota = this.route.snapshot?.queryParamMap?.get('clienteId') || '';
    const preSelecionada = paramId || queryOsId || '';

    this.osConhecidas.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => {
        this.osLista.set(lista);
        this.carregandoOs.set(false);
        if (preSelecionada) this.selecionarOs(preSelecionada);
      },
      error: () => {
        this.carregandoOs.set(false);
        if (preSelecionada) this.selecionarOs(preSelecionada);
      },
    });

    this.servicoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => this.servicos.set(lista),
      error: () => this.servicos.set([]),
    });

    this.insumoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => this.insumos.set(lista),
      error: () => this.insumos.set([]),
    });
  }

  /** Seleciona uma OS da lista; um código fora da lista é carregado pelo `OsConhecidasService`. */
  selecionarOs(osId: string): void {
    this.erroOs.set(null);
    this.buscaOs.set('');
    if (!osId) return;

    const conhecida = this.osLista().find(os => os.id.toLowerCase() === osId.toLowerCase());
    if (conhecida) {
      this.aplicarOs(conhecida);
      return;
    }

    this.resolvendoOs.set(true);
    this.osConhecidas.resolver(osId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: os => {
        this.resolvendoOs.set(false);
        if (!os) {
          this.erroOs.set(MENSAGEM_OS_NAO_ENCONTRADA);
          return;
        }
        this.osLista.update(lista => [os, ...lista.filter(o => o.id !== os.id)]);
        this.aplicarOs(os);
      },
      error: () => {
        this.resolvendoOs.set(false);
        this.erroOs.set(MENSAGEM_OS_NAO_ENCONTRADA);
      },
    });
  }

  private aplicarOs(os: OsEnriquecida): void {
    this.osSelecionada.set(os);
    const doAtalho = this.osJornadaStore.obter(os.id)?.clienteId;
    this.clienteId.set(os.clienteId || this.clienteIdDaRota || doAtalho || '');
  }

  adicionarServico(servico: Servico, quantidade = 1): void {
    const refId = servico.id ?? servico.nome;
    const precoUnitario = Number(servico.precoUnitario ?? servico.precoBase ?? servico.valorTabelado ?? 0);
    const qtd = Math.max(1, Number(quantidade) || 1);

    const atuais = this.itens();
    const index = atuais.findIndex(it => it.tipo === 'Servico' && it.referenciaId === refId);

    if (index >= 0) {
      const itemExistente = atuais[index];
      const novaQtd = itemExistente.quantidade + qtd;
      const atualizados = [...atuais];
      atualizados[index] = {
        ...itemExistente,
        quantidade: novaQtd,
        subtotal: Number((novaQtd * precoUnitario).toFixed(2))
      };
      this.itens.set(atualizados);
    } else {
      const novo: ItemOrcamento = {
        tipo: 'Servico',
        referenciaId: refId,
        nome: servico.nome,
        quantidade: qtd,
        precoUnitario,
        subtotal: Number((qtd * precoUnitario).toFixed(2)),
      };
      this.itens.set([...atuais, novo]);
    }
  }

  adicionarInsumo(insumo: Insumo, quantidade = 1): void {
    const refId = insumo.id ?? insumo.nome;
    const precoUnitario = Number(insumo.precoUnitario ?? insumo.valor ?? 0);
    const qtd = Math.max(1, Number(quantidade) || 1);

    const atuais = this.itens();
    const index = atuais.findIndex(it => it.tipo === 'Insumo' && it.referenciaId === refId);

    if (index >= 0) {
      const itemExistente = atuais[index];
      const novaQtd = itemExistente.quantidade + qtd;
      const atualizados = [...atuais];
      atualizados[index] = {
        ...itemExistente,
        quantidade: novaQtd,
        subtotal: Number((novaQtd * precoUnitario).toFixed(2))
      };
      this.itens.set(atualizados);
    } else {
      const novo: ItemOrcamento = {
        tipo: 'Insumo',
        referenciaId: refId,
        nome: insumo.nome,
        quantidade: qtd,
        precoUnitario,
        subtotal: Number((qtd * precoUnitario).toFixed(2)),
      };
      this.itens.set([...atuais, novo]);
    }
  }

  atualizarQuantidade(index: number, novaQtdRaw: any): void {
    const qtd = Math.max(1, Number(novaQtdRaw) || 1);
    const atuais = [...this.itens()];
    if (index >= 0 && index < atuais.length) {
      const item = atuais[index];
      atuais[index] = {
        ...item,
        quantidade: qtd,
        subtotal: Number((qtd * item.precoUnitario).toFixed(2))
      };
      this.itens.set(atuais);
    }
  }

  removerItem(index: number): void {
    this.itens.update(atuais => atuais.filter((_, i) => i !== index));
  }

  enviar(): void {
    const ordemServicoId = this.ordemServicoId().trim();
    const clienteId = this.clienteId().trim();
    if (!ordemServicoId || !clienteId) return;

    const noModoItens = this.modo() === 'itens';
    const itens = this.itens();
    if (noModoItens && itens.length === 0) return;
    if (!noModoItens && this.valorAvulso <= 0) return;

    this.enviando.set(true);

    const payload = noModoItens
      ? {
          ordemServicoId,
          clienteId,
          valor: 0, // Backend Cobranca exige valor: 0 quando itens estão presentes
          itens: agruparItensOrcamento(itens),
        }
      : {
          ordemServicoId,
          clienteId,
          valor: Number(this.valorAvulso.toFixed(2)),
          itens: undefined,
        };

    this.orcamentoService.criar(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resposta => {
        this.orcamentoCriado.set(resposta);
        this.enviando.set(false);

        // Atualiza a jornada
        this.osJornadaStore.salvar({
          osId: ordemServicoId,
          clienteId,
          orcamentoId: resposta.id,
        });
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }
}
