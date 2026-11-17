import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OrcamentoService } from '../../services/orcamento.service';
import { ServicoService } from '../../../servicos/services/servico.service';
import { InsumoService } from '../../../insumos/services/insumo.service';
import { Servico } from '../../../servicos/models/servico.model';
import { Insumo } from '../../../insumos/models/insumo.model';
import { ItemOrcamento, OrcamentoCriadoResponse, agruparItensOrcamento } from '../../models/orcamento.model';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

@Component({
  selector: 'app-orcamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, PageContainerComponent, CustomSelectComponent],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">Montar Orçamento</h1>
          <p class="page-subtitle">Selecione serviços e insumos do catálogo da Execução ou informe valor avulso.</p>
        </div>
      </div>

      <section class="card-panel" style="margin-bottom: 1.25rem;">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="orc-os-id">Ordem de Serviço (ID)</label>
            @if (osOptions().length > 0) {
              <div style="margin-bottom: 0.5rem;">
                <app-custom-select
                  [options]="osOptions()"
                  [value]="ordemServicoId"
                  (valueChange)="selecionarOs($event)"
                  placeholder="Selecione uma OS recente..."
                ></app-custom-select>
              </div>
            }
            <input id="orc-os-id" type="text" [(ngModel)]="ordemServicoId" name="ordemServicoId" class="form-control" placeholder="UUID da OS" />
          </div>
          <div class="form-group">
            <label class="form-label" for="orc-cliente-id">Cliente (ID)</label>
            <input id="orc-cliente-id" type="text" [(ngModel)]="clienteId" name="clienteId" class="form-control" placeholder="UUID do Cliente" />
          </div>
        </div>

        <div class="mode-selector">
          <label class="mode-label">
            <input type="radio" name="modo" value="itens" [checked]="modo() === 'itens'" (change)="modo.set('itens')" />
            Modo com Itens do Catálogo (Padrão)
          </label>
          <label class="mode-label">
            <input type="radio" name="modo" value="avulso" [checked]="modo() === 'avulso'" (change)="modo.set('avulso')" />
            Modo Valor Avulso (Sem Itens)
          </label>
        </div>
      </section>

      @if (modo() === 'itens') {
        <div class="grid-2" style="margin-bottom: 1.25rem;">
          <section class="card-panel" aria-label="Catálogo de Serviços">
            <h3 class="secao">Serviços</h3>
            <ul class="lista">
              @for (s of servicos(); track s.id ?? s.nome) {
                <li class="linha" data-testid="catalogo-servico">
                  <div>
                    <strong>{{ s.nome }}</strong>
                    <span class="detalhe"> — R$ {{ (s.precoUnitario ?? s.precoBase ?? s.valorTabelado ?? 0) | number:'1.2-2' }}</span>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="adicionarServico(s)">
                    + Adicionar
                  </button>
                </li>
              } @empty {
                <li class="linha">Nenhum serviço disponível.</li>
              }
            </ul>
          </section>

          <section class="card-panel" aria-label="Catálogo de Insumos">
            <h3 class="secao">Insumos</h3>
            <ul class="lista">
              @for (i of insumos(); track i.id ?? i.nome) {
                <li class="linha" data-testid="catalogo-insumo">
                  <div>
                    <strong>{{ i.nome }}</strong>
                    <span class="detalhe">
                      — R$ {{ (i.precoUnitario ?? i.valor ?? 0) | number:'1.2-2' }}
                      (Saldo: {{ i.quantidadeDisponivel ?? i.saldoDisponivel ?? i.quantidadeEstoque ?? 0 }})
                    </span>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="adicionarInsumo(i)">
                    + Adicionar
                  </button>
                </li>
              } @empty {
                <li class="linha">Nenhum insumo disponível.</li>
              }
            </ul>
          </section>
        </div>

        <section class="card-panel" aria-label="Itens do Orçamento">
          <h3 class="secao">Itens Selecionados</h3>
          <ul class="lista">
            @for (item of itens(); track $index) {
              <li class="linha" data-testid="item-orcamento">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span>{{ item.nome }} ({{ item.tipo }})</span>
                  <div class="qtd-control">
                    <label class="sr-only">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      [ngModel]="item.quantidade"
                      (ngModelChange)="atualizarQuantidade($index, $event)"
                      class="input-qtd"
                    />
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <strong>R$ {{ item.subtotal | number:'1.2-2' }}</strong>
                  <button type="button" class="btn btn-danger btn-sm" (click)="removerItem($index)">Remover</button>
                </div>
              </li>
            } @empty {
              <li class="linha">Adicione serviços ou insumos para compor o orçamento.</li>
            }
          </ul>

          <div class="rodape-total">
            <div data-testid="total-orcamento">
              Total calculado: <strong>R$ {{ total() | number:'1.2-2' }}</strong>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              data-testid="btn-enviar-orcamento"
              [disabled]="enviando() || !ordemServicoId.trim() || !clienteId.trim() || itens().length === 0"
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

          <div class="rodape-total" style="margin-top: 1rem;">
            <button
              type="button"
              class="btn btn-primary"
              data-testid="btn-enviar-orcamento"
              [disabled]="enviando() || !ordemServicoId.trim() || !clienteId.trim() || valorAvulso <= 0"
              (click)="enviar()"
            >
              {{ enviando() ? 'Enviando...' : 'Enviar Orçamento Avulso' }}
            </button>
          </div>
        </section>
      }

      @if (orcamentoCriado(); as criado) {
        <div class="resultado-criado" role="status" data-testid="orcamento-criado">
          <p>Orçamento criado: <strong>{{ criado.id }}</strong></p>
          <p>Status: <strong>{{ criado.status }}</strong></p>
          <p>Valor: <strong>R$ {{ criado.valor | number:'1.2-2' }}</strong></p>
        </div>
      }
    </app-page-container>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .card-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; }
    .secao { font-family: 'Outfit', sans-serif; font-size: 1.05rem; color: var(--primary); margin-bottom: 0.75rem; }
    .lista { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); }
    .detalhe { color: var(--text-muted); font-size: 0.85rem; }
    .btn-sm { padding: 0.3rem 0.65rem; font-size: 0.8rem; }
    .rodape-total { display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
    .resultado-criado { margin-top: 1rem; padding: 1rem; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--text-main); }
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
    .mode-selector { display: flex; gap: 1.5rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); }
    .mode-label { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--text-main); cursor: pointer; }
    .input-qtd {
      width: 60px;
      padding: 0.25rem 0.4rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      text-align: center;
    }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
  `]
})
export class OrcamentoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly servicoService = inject(ServicoService);
  private readonly insumoService = inject(InsumoService);
  private readonly orcamentoService = inject(OrcamentoService);
  private readonly osJornadaStore = inject(OsJornadaStore);

  ordemServicoId = '';
  clienteId = '';
  valorAvulso = 0;

  readonly modo = signal<'itens' | 'avulso'>('itens');
  readonly servicos = signal<Servico[]>([]);
  readonly insumos = signal<Insumo[]>([]);
  readonly itens = signal<ItemOrcamento[]>([]);
  readonly enviando = signal(false);
  readonly orcamentoCriado = signal<OrcamentoCriadoResponse | null>(null);

  readonly osOptions = computed<SelectOption[]>(() =>
    this.osJornadaStore.registros().map(r => ({
      value: r.osId,
      label: `OS ${r.osId.slice(0, 8)}...`
    }))
  );

  readonly total = computed(() =>
    this.itens().reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0)
  );

  ngOnInit(): void {
    const paramId = this.route.snapshot?.paramMap?.get('id');
    const queryOsId = this.route.snapshot?.queryParamMap?.get('ordemServicoId');
    const queryClienteId = this.route.snapshot?.queryParamMap?.get('clienteId');
    this.ordemServicoId = paramId || queryOsId || '';
    this.clienteId = queryClienteId || '';

    // Se a OS já está na jornada, completa clienteId se não fornecido
    if (this.ordemServicoId) {
      const reg = this.osJornadaStore.obter(this.ordemServicoId);
      if (reg?.clienteId && !this.clienteId) {
        this.clienteId = reg.clienteId;
      }
    }

    this.servicoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => this.servicos.set(lista),
      error: () => this.servicos.set([]),
    });

    this.insumoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => this.insumos.set(lista),
      error: () => this.insumos.set([]),
    });
  }

  selecionarOs(osId: string): void {
    this.ordemServicoId = osId;
    const reg = this.osJornadaStore.obter(osId);
    if (reg?.clienteId) {
      this.clienteId = reg.clienteId;
    }
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
    const ordemServicoId = this.ordemServicoId.trim();
    const clienteId = this.clienteId.trim();
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
