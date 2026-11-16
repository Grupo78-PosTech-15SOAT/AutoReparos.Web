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
import { ItemOrcamento, OrcamentoCriadoResponse } from '../../models/orcamento.model';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';

@Component({
  selector: 'app-orcamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, PageContainerComponent],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">Montar Orçamento</h1>
          <p class="page-subtitle">Selecione serviços e insumos do catálogo da Execução e envie à Cobrança.</p>
        </div>
      </div>

      <section class="card-panel" style="margin-bottom: 1.25rem;">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="orc-os-id">Ordem de Serviço (ID)</label>
            <input id="orc-os-id" type="text" [(ngModel)]="ordemServicoId" name="ordemServicoId" class="form-control" placeholder="UUID da OS" />
          </div>
          <div class="form-group">
            <label class="form-label" for="orc-cliente-id">Cliente (ID)</label>
            <input id="orc-cliente-id" type="text" [(ngModel)]="clienteId" name="clienteId" class="form-control" placeholder="UUID do Cliente" />
          </div>
        </div>
      </section>

      <div class="grid-2" style="margin-bottom: 1.25rem;">
        <section class="card-panel" aria-label="Catálogo de Serviços">
          <h3 class="secao">Serviços</h3>
          <ul class="lista">
            @for (s of servicos(); track s.id ?? s.nome) {
              <li class="linha" data-testid="catalogo-servico">
                <div>
                  <strong>{{ s.nome }}</strong>
                  <span class="detalhe"> — R$ {{ (s.precoBase ?? s.valorTabelado ?? 0) | number:'1.2-2' }}</span>
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
                    (Saldo: {{ i.saldoDisponivel ?? i.quantidadeEstoque ?? 0 }})
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
              <span>{{ item.nome }} ({{ item.tipo }}) x{{ item.quantidade }}</span>
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

        @if (orcamentoCriado(); as criado) {
          <div class="resultado-criado" role="status" data-testid="orcamento-criado">
            <p>Orçamento criado: <strong>{{ criado.id }}</strong></p>
            <p>Status: <strong>{{ criado.status }}</strong></p>
            <p>Valor: <strong>R$ {{ criado.valor | number:'1.2-2' }}</strong></p>
          </div>
        }
      </section>
    </app-page-container>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .secao { font-family: 'Outfit', sans-serif; font-size: 1.05rem; color: #ED145B; margin-bottom: 0.75rem; }
    .lista { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .detalhe { color: #A1A1AA; font-size: 0.85rem; }
    .btn-sm { padding: 0.3rem 0.65rem; font-size: 0.8rem; }
    .rodape-total { display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .resultado-criado { margin-top: 1rem; padding: 1rem; border-radius: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #F8FAFC; }
  `]
})
export class OrcamentoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly servicoService = inject(ServicoService);
  private readonly insumoService = inject(InsumoService);
  private readonly orcamentoService = inject(OrcamentoService);

  ordemServicoId = '';
  clienteId = '';

  readonly servicos = signal<Servico[]>([]);
  readonly insumos = signal<Insumo[]>([]);
  readonly itens = signal<ItemOrcamento[]>([]);
  readonly enviando = signal(false);
  readonly orcamentoCriado = signal<OrcamentoCriadoResponse | null>(null);

  readonly total = computed(() =>
    this.itens().reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0)
  );

  ngOnInit(): void {
    const paramId = this.route.snapshot?.paramMap?.get('id');
    const queryOsId = this.route.snapshot?.queryParamMap?.get('ordemServicoId');
    const queryClienteId = this.route.snapshot?.queryParamMap?.get('clienteId');
    this.ordemServicoId = paramId || queryOsId || '';
    this.clienteId = queryClienteId || '';

    this.servicoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => this.servicos.set(lista),
      error: () => this.servicos.set([]),
    });

    this.insumoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => this.insumos.set(lista),
      error: () => this.insumos.set([]),
    });
  }

  adicionarServico(servico: Servico, quantidade = 1): void {
    const precoUnitario = Number(servico.precoBase ?? servico.valorTabelado ?? 0);
    const qtd = Math.max(1, Number(quantidade) || 1);
    const novo: ItemOrcamento = {
      tipo: 'Servico',
      referenciaId: servico.id ?? servico.nome,
      nome: servico.nome,
      quantidade: qtd,
      precoUnitario,
      subtotal: qtd * precoUnitario,
    };
    this.itens.update(atuais => [...atuais, novo]);
  }

  adicionarInsumo(insumo: Insumo, quantidade = 1): void {
    const precoUnitario = Number(insumo.precoUnitario ?? insumo.valor ?? 0);
    const qtd = Math.max(1, Number(quantidade) || 1);
    const novo: ItemOrcamento = {
      tipo: 'Insumo',
      referenciaId: insumo.id ?? insumo.nome,
      nome: insumo.nome,
      quantidade: qtd,
      precoUnitario,
      subtotal: qtd * precoUnitario,
    };
    this.itens.update(atuais => [...atuais, novo]);
  }

  removerItem(index: number): void {
    this.itens.update(atuais => atuais.filter((_, i) => i !== index));
  }

  enviar(): void {
    const ordemServicoId = this.ordemServicoId.trim();
    const clienteId = this.clienteId.trim();
    const itens = this.itens();
    if (!ordemServicoId || !clienteId || itens.length === 0) return;

    this.enviando.set(true);
    this.orcamentoService.criar({
      ordemServicoId,
      clienteId,
      valor: this.total(),
      itens,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resposta => {
        this.orcamentoCriado.set(resposta);
        this.enviando.set(false);
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }
}
