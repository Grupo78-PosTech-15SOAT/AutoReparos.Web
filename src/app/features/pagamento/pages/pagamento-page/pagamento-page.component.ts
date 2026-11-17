import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PagamentoService } from '../../services/pagamento.service';
import { CheckoutResponse, ReembolsoResponse } from '../../models/pagamento.model';
import { AuthService } from '../../../auth/services/auth.service';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-pagamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, PageContainerComponent, CustomSelectComponent],
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
          <label class="form-label" for="input-pagamento-id">Código do Pagamento (ID)</label>
          @if (osOptions().length > 0) {
            <div style="margin-bottom: 0.5rem;">
              <app-custom-select
                [options]="osOptions()"
                [value]="pagamentoId"
                (valueChange)="selecionarOs($event)"
                placeholder="Selecione um pagamento recente..."
              ></app-custom-select>
            </div>
          }
          <input
            id="input-pagamento-id"
            type="text"
            [(ngModel)]="pagamentoId"
            name="pagamentoId"
            class="form-control"
            placeholder="UUID do pagamento"
          />
        </div>

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
              <p>Checkout pronto:</p>
              <a
                [href]="ck.urlCheckout"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-success"
                data-testid="link-url-checkout"
              >
                Abrir Checkout ({{ ck.urlCheckout }})
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

            <button
              type="submit"
              class="btn btn-danger"
              data-testid="btn-solicitar-reembolso"
              [disabled]="enviandoReembolso() || !pagamentoId.trim() || valorReembolso <= 0 || !motivoReembolso.trim() || !referenciaReembolso.trim()"
            >
              {{ enviandoReembolso() ? 'Solicitando...' : 'Solicitar reembolso' }}
            </button>
          </form>

          @if (reembolso(); as rb) {
            <div class="resultado-box" role="status" data-testid="reembolso-confirmacao">
              <p>Reembolso registrado com sucesso ({{ rb.status ?? 'Processado' }}).</p>
              @if (rb.valor !== undefined) {
                <p>Valor: <strong>R$ {{ rb.valor | number:'1.2-2' }}</strong></p>
              }
              @if (rb.referencia) {
                <p>Referência: <strong>{{ rb.referencia }}</strong></p>
              }
            </div>
          }
        </section>
      }
    </app-page-container>
  `,
  styles: [`
    .secao { font-family: 'Outfit', sans-serif; font-size: 1.05rem; color: var(--primary); margin-bottom: 0.75rem; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .form-reembolso { display: flex; flex-direction: column; gap: 0.85rem; }
    .resultado-box { margin-top: 1rem; padding: 1rem; border-radius: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--text-main); }
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

  readonly osOptions = computed<SelectOption[]>(() =>
    this.osJornadaStore
      .registros()
      .filter(r => r.pagamentoId || r.osId)
      .map(r => ({
        value: r.pagamentoId ?? r.osId,
        label: `OS ${r.osId.slice(0, 8)}...` + (r.pagamentoId ? ` (Pagamento ${r.pagamentoId.slice(0, 8)}...)` : ''),
      }))
  );

  selecionarOs(valor: string): void {
    const reg = this.osJornadaStore.obter(valor) ?? this.osJornadaStore.obterPorPagamento(valor);
    this.pagamentoId = reg?.pagamentoId ?? valor;
  }

  ngOnInit(): void {
    const paramId = this.route.snapshot?.paramMap?.get('id');
    const queryId = this.route.snapshot?.queryParamMap?.get('pagamentoId') || this.route.snapshot?.queryParamMap?.get('id');
    this.pagamentoId = paramId || queryId || '';
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
