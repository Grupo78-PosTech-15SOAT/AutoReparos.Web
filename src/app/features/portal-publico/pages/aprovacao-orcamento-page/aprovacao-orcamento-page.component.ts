import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo, resolverMensagemErro, extrairCodigoErro, extrairDetalheErro } from '../../../../core/http/error-catalog';
import { STATUS_TRATADOS_NA_TELA } from '../../../../core/http/http-context';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';
import { AlertBannerComponent } from '../../../../shared/components/alert-banner/alert-banner.component';

export interface AuthClienteResponse {
  token?: string;
  accessToken?: string;
}

export interface AprovacaoOrcamentoResponse {
  id?: string;
  orcamentoId?: string;
  status?: string;
  pagamentoId?: string;
}

export interface CheckoutResponse {
  urlCheckout?: string;
  url?: string;
}

@Component({
  selector: 'app-aprovacao-orcamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageContainerComponent, IdBadgeComponent, AlertBannerComponent],
  template: `
    <app-page-container [maxWidth]="'680px'">
      <div class="approval-card">
        <header class="brand-header">
          <h1 class="card-title">Aprovação de Orçamento</h1>
          <p class="card-subtitle">Informe o código do orçamento, seu CPF e e-mail para aprovar.</p>
        </header>

        @if (!aprovacao()) {
          <form (ngSubmit)="aprovar()" class="form-aprovacao">
            <div class="form-group">
              <label class="form-label" for="input-orcamento-id">Código do Orçamento</label>
              <input
                id="input-orcamento-id"
                type="text"
                [(ngModel)]="orcamentoId"
                name="orcamentoId"
                required
                class="form-control"
                placeholder="UUID do orçamento"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="input-cpf">CPF</label>
              <input
                id="input-cpf"
                type="text"
                [(ngModel)]="cpf"
                name="cpf"
                required
                class="form-control"
                placeholder="000.000.000-00"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="input-email">E-mail</label>
              <input
                id="input-email"
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="form-control"
                placeholder="cliente@exemplo.com"
              />
            </div>

            @if (erro(); as mensagemErro) {
              <div data-testid="erro-aprovacao">
                <app-alert-banner tipo="erro">{{ mensagemErro }}</app-alert-banner>
              </div>
            }

            <div class="decision-buttons">
              <button
                type="submit"
                data-testid="btn-aprovar-orcamento"
                [disabled]="enviando() || !orcamentoId.trim() || !cpf.trim() || !email.trim()"
                class="btn btn-success btn-lg"
                style="width: 100%;"
              >
                {{ enviando() ? 'Aprovando...' : '✓ Aprovar Orçamento' }}
              </button>
            </div>
          </form>
        } @else {
          @if (aprovacao(); as resultado) {
            <div class="success-box fade-in" role="status" data-testid="confirmacao-aprovacao">
              <h2>Orçamento Aprovado!</h2>
              <p>Sua aprovação foi registrada com sucesso.</p>

              @if (resultado.pagamentoId) {
                <div class="pagamento-info" data-testid="pagamento-id">
                  <span>Pagamento gerado:</span>
                  <app-id-badge [text]="resultado.pagamentoId"></app-id-badge>
                </div>

                <div class="checkout-section">
                  <button
                    type="button"
                    class="btn btn-primary btn-lg"
                    data-testid="btn-checkout-cliente"
                    [disabled]="iniciandoCheckout()"
                    (click)="iniciarCheckout()"
                  >
                    {{ iniciandoCheckout() ? 'Iniciando Checkout...' : '💳 Iniciar Checkout Agora' }}
                  </button>

                  @if (erroCheckout(); as erroMsg) {
                    <div data-testid="erro-checkout" style="width: 100%;">
                      <app-alert-banner tipo="aviso">{{ erroMsg }}</app-alert-banner>
                    </div>
                  }

                  @if (urlCheckout()) {
                    <div class="checkout-link-box" data-testid="url-checkout">
                      <a [href]="urlCheckout()" target="_blank" rel="noopener noreferrer" class="checkout-link">
                        Abrir link de pagamento Mercado Pago &rarr;
                      </a>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </app-page-container>
  `,
  styles: [`
    .approval-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-pink);
      border-radius: var(--radius-lg);
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .brand-header { text-align: center; margin-bottom: 1.75rem; }
    .card-title { font-family: 'Outfit', sans-serif; font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0; }
    .card-subtitle { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem; }
    .form-aprovacao { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }
    .form-control {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      color: var(--text-main);
      font-size: 0.95rem;
      outline: none;
    }
    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--border-pink);
    }
    .decision-buttons { display: flex; gap: 1rem; margin-top: 0.5rem; }
    .btn-lg { padding: 0.85rem 1.25rem; font-size: 0.95rem; border-radius: var(--radius-sm); cursor: pointer; border: none; font-weight: 600; }
    .btn-success { background: var(--accent-green); color: var(--text-main); }
    .btn-success:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary { background: var(--primary); color: var(--text-main); }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .erro-msg { color: var(--accent-red); font-size: 0.9rem; margin: 0.5rem 0 0; }
    .success-box { text-align: center; padding: 1.5rem 1rem; color: var(--text-main); }
    .pagamento-info {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0;
      padding: 0.5rem 1rem;
      background: var(--bg-card);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }
    .checkout-section {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .checkout-link-box {
      margin-top: 0.5rem;
    }
    .checkout-link {
      color: var(--accent-cyan);
      font-weight: 600;
      text-decoration: underline;
    }
  `]
})
export class AprovacaoOrcamentoPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  orcamentoId = '';
  cpf = '';
  email = '';

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aprovacao = signal<AprovacaoOrcamentoResponse | null>(null);

  readonly clienteToken = signal<string | null>(null);
  readonly iniciandoCheckout = signal(false);
  readonly erroCheckout = signal<string | null>(null);
  readonly urlCheckout = signal<string | null>(null);

  ngOnInit(): void {
    const q = this.route.snapshot?.queryParamMap;
    this.orcamentoId = q?.get('orcamentoId') || q?.get('id') || '';
  }

  aprovar(): void {
    const id = this.orcamentoId.trim();
    const cpf = this.cpf.trim();
    const email = this.email.trim();
    if (!id || !cpf || !email) return;

    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [401, 403, 404, 409, 422]);
    this.enviando.set(true);
    this.erro.set(null);

    this.http
      .post<AuthClienteResponse>(API_ENDPOINTS.AUTH.CLIENTE, { cpf, email }, { context })
      .pipe(
        switchMap(authRes => {
          const jwt = authRes?.token ?? authRes?.accessToken ?? '';
          this.clienteToken.set(jwt);
          const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
          return this.http.post<AprovacaoOrcamentoResponse>(
            API_ENDPOINTS.ORCAMENTOS.APROVACAO(id),
            {},
            { headers, context }
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: res => {
          const dados = res ?? { orcamentoId: id, status: 'Aprovado' };
          this.aprovacao.set(dados);
          this.enviando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const codigo = extrairCodigoErro(e.error);
          const detalhe = extrairDetalheErro(e.error);
          const resolvida = resolverMensagemErro(e.status, codigo, detalhe);
          const padrao = resolvida?.mensagem ?? MENSAGENS_POR_STATUS[e.status]?.mensagem ?? 'Não foi possível aprovar o orçamento.';
          this.erro.set(mensagemDoCodigo(codigo, detalhe ?? padrao));
          this.enviando.set(false);
        },
      });
  }

  iniciarCheckout(): void {
    const pagamentoId = this.aprovacao()?.pagamentoId;
    const token = this.clienteToken();
    if (!pagamentoId || !token) return;

    this.iniciandoCheckout.set(true);
    this.erroCheckout.set(null);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const context = new HttpContext().set(STATUS_TRATADOS_NA_TELA, [401, 403, 404, 409, 422]);

    this.http
      .post<CheckoutResponse>(
        API_ENDPOINTS.PAGAMENTOS.CHECKOUT(pagamentoId),
        {},
        { headers, context }
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.urlCheckout.set(res?.urlCheckout ?? res?.url ?? null);
          this.iniciandoCheckout.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const codigo = extrairCodigoErro(e.error);
          const detalhe = extrairDetalheErro(e.error);
          const resolvida = resolverMensagemErro(e.status, codigo, detalhe);
          const padrao = e.status === 409
            ? 'O checkout só fica disponível após a conclusão dos serviços na oficina (checkout_indisponivel).'
            : (resolvida?.mensagem ?? MENSAGENS_POR_STATUS[e.status]?.mensagem ?? 'Checkout indisponível.');
          this.erroCheckout.set(mensagemDoCodigo(codigo, detalhe ?? padrao));
          this.iniciandoCheckout.set(false);
        }
      });
  }
}
