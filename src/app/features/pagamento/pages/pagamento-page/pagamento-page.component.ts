import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PagamentoService } from '../../services/pagamento.service';
import { CheckoutResponse, ReembolsoResponse } from '../../models/pagamento.model';
import { AuthService } from '../../../auth/services/auth.service';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { IdBadgeComponent, idCurto } from '../../../../shared/components/id-badge/id-badge.component';
import { MoedaPipe } from '../../../../shared/pipes/moeda.pipe';
import {
  OsConhecidasService,
  OsEnriquecida,
  opcaoDeOs,
} from '../../../ordens-servico/services/os-conhecidas.service';

@Component({
  selector: 'app-pagamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageContainerComponent, CustomSelectComponent, IdBadgeComponent, MoedaPipe],
  template: `
    <app-page-container maxWidth="760px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Pagamento e Reembolso</h1>
          <p class="page-subtitle">Inicie o checkout no Mercado Pago ou registre reembolso administrativo.</p>
        </div>
      </div>

      <section class="card-panel" style="margin-bottom: 1.25rem;" aria-label="Checkout de Pagamento">
        <h3 class="secao">Checkout</h3>
        <div class="form-group">
          <label class="form-label" for="pag-seletor-os">Ordem de Serviço</label>
          <app-custom-select
            data-testid="seletor-os-pagamento"
            idGatilho="pag-seletor-os"
            [options]="osOptions()"
            [value]="pagamentoId"
            [loading]="carregandoOs()"
            [buscaSempre]="true"
            placeholder="Selecione a OS com pagamento gerado"
            placeholderBusca="Código, placa, modelo ou cliente"
            textoVazio="Nenhuma OS com pagamento conhecido"
            (valueChange)="selecionarOs($event)"
          ></app-custom-select>
        </div>

        <div class="form-group">
          <label class="form-label" for="input-pagamento-id">Ou informe o código do pagamento</label>
          <input
            id="input-pagamento-id"
            type="text"
            [(ngModel)]="pagamentoId"
            name="pagamentoId"
            class="form-control mono"
            placeholder="Código completo do pagamento"
          />
        </div>

        @if (pagamentoId.trim()) {
          <p class="pagamento-atual" data-testid="pagamento-selecionado">
            <span class="text-muted">Pagamento:</span>
            <app-id-badge [text]="pagamentoId.trim()" size="sm"></app-id-badge>
          </p>
        }

        <button
          type="button"
          class="btn btn-primary"
          data-testid="btn-iniciar-checkout"
          [disabled]="enviandoCheckout() || !pagamentoId.trim()"
          (click)="iniciarCheckout()"
        >
          {{ enviandoCheckout() ? 'Gerando checkout...' : 'Iniciar checkout' }}
        </button>

        @if (checkout(); as ck) {
          @if (ck.urlCheckout) {
            <div class="resultado-box" role="status" data-testid="checkout-resultado">
              <p>Checkout pronto. O link abre o Mercado Pago em outra aba.</p>
              <a
                [href]="ck.urlCheckout"
                [title]="ck.urlCheckout"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-success"
                data-testid="link-url-checkout"
              >
                Abrir checkout
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          }
        }
      </section>

      @if (ehAdministrador()) {
        <section class="card-panel" aria-label="Solicitar Reembolso" data-testid="secao-reembolso">
          <h3 class="secao">Solicitar Reembolso (Administrador)</h3>
          <form (ngSubmit)="solicitarReembolso()" class="form-reembolso">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="reembolso-valor">Valor (R$)</label>
                <input
                  id="reembolso-valor"
                  type="number"
                  step="0.01"
                  [(ngModel)]="valorReembolso"
                  name="valorReembolso"
                  required
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="reembolso-referencia">Referência</label>
                <input
                  id="reembolso-referencia"
                  type="text"
                  [(ngModel)]="referenciaReembolso"
                  name="referenciaReembolso"
                  required
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reembolso-motivo">Motivo</label>
              <input
                id="reembolso-motivo"
                type="text"
                [(ngModel)]="motivoReembolso"
                name="motivoReembolso"
                required
                class="form-control"
              />
            </div>

            <div>
              <button
                type="submit"
                class="btn btn-danger"
                data-testid="btn-solicitar-reembolso"
                [disabled]="enviandoReembolso() || !pagamentoId.trim() || valorReembolso <= 0 || !motivoReembolso.trim() || !referenciaReembolso.trim()"
              >
                {{ enviandoReembolso() ? 'Solicitando...' : 'Solicitar reembolso' }}
              </button>
            </div>
          </form>

          @if (reembolso(); as rb) {
            <div class="resultado-box" role="status" data-testid="reembolso-confirmacao">
              <p>Reembolso registrado com sucesso ({{ rb.status ?? 'Processado' }}).</p>
              @if (rb.valor !== undefined) {
                <p>Valor: <strong data-testid="valor-reembolso">{{ rb.valor | moeda }}</strong></p>
              }
              @if (rb.referencia) {
                <p>Referência: <strong>{{ rb.referencia }}</strong></p>
              }
              @if (rb.id) {
                <p class="linha-id">Reembolso: <app-id-badge [text]="rb.id" size="sm"></app-id-badge></p>
              }
            </div>
          }
        </section>
      }
    </app-page-container>
  `,
  styles: [`
    .secao { font-family: var(--font-display); font-size: 1.05rem; color: var(--primary); margin-bottom: 0.75rem; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .form-reembolso { display: flex; flex-direction: column; }
    .pagamento-atual, .linha-id { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
    .resultado-box { margin-top: 1rem; padding: 1rem; border-radius: var(--radius-sm); background: var(--success-bg); border: 1px solid var(--success-border); color: var(--text-main); display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .resultado-box p { margin: 0; }
  `]
})
export class PagamentoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly pagamentoService = inject(PagamentoService);
  private readonly auth = inject(AuthService);
  private readonly osJornadaStore = inject(OsJornadaStore);

  pagamentoId = '';
  valorReembolso = 0;
  motivoReembolso = '';
  referenciaReembolso = '';

  readonly enviandoCheckout = signal(false);
  readonly enviandoReembolso = signal(false);
  readonly checkout = signal<CheckoutResponse | null>(null);
  readonly reembolso = signal<ReembolsoResponse | null>(null);

  private readonly osConhecidas = inject(OsConhecidasService);

  readonly osLista = signal<OsEnriquecida[]>([]);
  readonly carregandoOs = signal(true);

  /** OS com pagamento conhecido (atalho local), com código, placa e modelo no rótulo. */
  readonly osOptions = computed<SelectOption[]>(() => {
    const porId = new Map(this.osLista().map(os => [os.id, os]));
    return this.osJornadaStore
      .registros()
      .filter(r => !!r.pagamentoId)
      .map(r => {
        const pagamento = `Pagamento ${idCurto(r.pagamentoId)}`;
        const os = porId.get(r.osId);
        if (!os) {
          return { value: r.pagamentoId!, label: idCurto(r.osId), descricao: pagamento, palavrasChave: `${r.osId} ${r.pagamentoId}` };
        }
        const base = opcaoDeOs(os);
        return {
          ...base,
          value: r.pagamentoId!,
          descricao: `${base.descricao} · ${pagamento}`,
          palavrasChave: `${base.palavrasChave ?? ''} ${r.pagamentoId}`,
        };
      });
  });

  selecionarOs(valor: string): void {
    const reg = this.osJornadaStore.obter(valor) ?? this.osJornadaStore.obterPorPagamento(valor);
    this.pagamentoId = reg?.pagamentoId ?? valor;
  }

  ngOnInit(): void {
    const paramId = this.route.snapshot?.paramMap?.get('id');
    const queryId = this.route.snapshot?.queryParamMap?.get('pagamentoId') || this.route.snapshot?.queryParamMap?.get('id');
    this.pagamentoId = paramId || queryId || '';

    this.osConhecidas.carregar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => {
        this.osLista.set(lista);
        this.carregandoOs.set(false);
      },
      error: () => this.carregandoOs.set(false),
    });
  }

  ehAdministrador(): boolean {
    return this.auth.hasRole(['Administrador']);
  }

  iniciarCheckout(): void {
    const id = this.pagamentoId.trim();
    if (!id) return;

    this.enviandoCheckout.set(true);
    this.pagamentoService.iniciarCheckout(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.checkout.set(res);
        this.enviandoCheckout.set(false);
      },
      error: () => {
        this.enviandoCheckout.set(false);
      }
    });
  }

  solicitarReembolso(): void {
    const id = this.pagamentoId.trim();
    const motivo = this.motivoReembolso.trim();
    const referencia = this.referenciaReembolso.trim();
    if (!id || this.valorReembolso <= 0 || !motivo || !referencia || !this.ehAdministrador()) return;

    this.enviandoReembolso.set(true);
    this.pagamentoService.solicitarReembolso(id, {
      valor: Number(this.valorReembolso),
      motivo,
      referencia,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.reembolso.set(res ?? { pagamentoId: id, valor: this.valorReembolso, motivo, referencia, status: 'Aprovado' });
        this.enviandoReembolso.set(false);
      },
      error: () => {
        this.enviandoReembolso.set(false);
      }
    });
  }
}
