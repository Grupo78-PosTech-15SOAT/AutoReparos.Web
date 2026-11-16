import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo, resolverMensagemErro } from '../../../../core/http/error-catalog';
import { STATUS_TRATADOS_NA_TELA } from '../../../../core/http/http-context';

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

@Component({
  selector: 'app-aprovacao-orcamento-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="container fade-in" style="max-width: 650px; padding-top: 3rem;">
      <div class="approval-card">
        <div class="brand-header">
          <h1 class="card-title">Aprovação de Orçamento</h1>
          <p class="card-subtitle">Informe o código do orçamento, seu CPF e e-mail para aprovar.</p>
        </div>

        @if (!aprovacao(); as _) {
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
              <p class="erro-msg" role="alert" data-testid="erro-aprovacao">{{ mensagemErro }}</p>
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
                <p data-testid="pagamento-id">
                  Pagamento gerado: <strong>{{ resultado.pagamentoId }}</strong>
                </p>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .approval-card {
      background: rgba(24, 24, 28, 0.9);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(237, 20, 91, 0.3);
      border-radius: 16px;
      padding: 2.5rem;
    }
    .brand-header { text-align: center; margin-bottom: 1.75rem; }
    .card-title { font-family: 'Outfit', sans-serif; font-size: 1.75rem; font-weight: 800; color: #ffffff; }
    .card-subtitle { font-size: 0.875rem; color: #A1A1AA; margin-top: 0.25rem; }
    .form-aprovacao { display: flex; flex-direction: column; gap: 1rem; }
    .decision-buttons { display: flex; gap: 1rem; margin-top: 0.5rem; }
    .btn-lg { padding: 0.85rem 1.25rem; font-size: 0.95rem; }
    .erro-msg { color: #F87171; font-size: 0.9rem; margin: 0; }
    .success-box { text-align: center; padding: 1.5rem 1rem; color: #F8FAFC; }
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

  ngOnInit(): void {
    const q = this.route.snapshot?.queryParamMap;
    this.orcamentoId = q?.get('orcamentoId') || q?.get('id') || '';
    this.cpf = q?.get('cpf') || '';
    this.email = q?.get('email') || '';
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
          this.aprovacao.set(res ?? { orcamentoId: id, status: 'Aprovado' });
          this.enviando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const resolvida = resolverMensagemErro(e.status, e.error?.codigo);
          const padrao = resolvida?.mensagem ?? MENSAGENS_POR_STATUS[e.status]?.mensagem ?? 'Não foi possível aprovar o orçamento.';
          this.erro.set(mensagemDoCodigo(e.error?.codigo, e.error?.mensagem ?? padrao));
          this.enviando.set(false);
        },
      });
  }
}
