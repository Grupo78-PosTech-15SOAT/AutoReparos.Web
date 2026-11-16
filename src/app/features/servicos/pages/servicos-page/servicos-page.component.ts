import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicoService } from '../../services/servico.service';
import { Servico } from '../../models/servico.model';
import { NotificationService } from '../../../../core/ui/notification.service';

@Component({
  selector: 'app-servicos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="container fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Catálogo de Serviços</h1>
        </div>
        <button type="button" (click)="abrirModalNovo()" class="btn btn-primary" data-testid="btn-novo-servico">
          + Novo Serviço
        </button>
      </div>

      <div class="data-table-container table-loading-container">
        @if (loading()) {
          <div class="table-loading-overlay" role="status">
            <span class="table-loading-text">Carregando serviços...</span>
          </div>
        }
        <table class="data-table">
          <thead>
            <tr>
              <th>Serviço</th>
              <th style="text-align: center;">Preço Base</th>
            </tr>
          </thead>
          <tbody>
            @for (s of servicos(); track s.id ?? s.nome) {
              <tr>
                <td>
                  <div style="font-weight: 600;">{{ s.nome }}</div>
                  @if (s.descricao) {
                    <div style="font-size: 0.75rem; color: #A1A1AA;">{{ s.descricao }}</div>
                  }
                </td>
                <td style="text-align: center;">
                  <span>R$ {{ (s.precoBase ?? s.valorTabelado ?? 0) | number:'1.2-2' }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="2" style="text-align: center; padding: 2.5rem; color: #71717A;">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (exibirModal()) {
        <div class="modal-backdrop fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <h3>Novo Serviço</h3>
              <button type="button" (click)="exibirModal.set(false)" class="btn-close">&times;</button>
            </div>

            <form (ngSubmit)="salvar()">
              <div class="form-group">
                <label class="form-label" for="servico-nome">Nome do Serviço</label>
                <input id="servico-nome" type="text" [(ngModel)]="formServico.nome" name="nome" required class="form-control" />
              </div>

              <div class="form-group">
                <label class="form-label" for="servico-descricao">Descrição do Procedimento</label>
                <input id="servico-descricao" type="text" [(ngModel)]="formServico.descricao" name="descricao" class="form-control" />
              </div>

              <div class="form-group">
                <label class="form-label" for="servico-preco">Preço Base (R$)</label>
                <input id="servico-preco" type="number" step="0.01" [(ngModel)]="formServico.precoBase" name="precoBase" required class="form-control" />
              </div>

              <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                <button type="button" (click)="exibirModal.set(false)" class="btn btn-secondary">Cancelar</button>
                <button type="submit" [disabled]="enviando() || !formServico.nome.trim()" class="btn btn-primary">
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 12, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { background: #18181C; border: 1px solid rgba(237, 20, 91, 0.3); border-radius: 12px; padding: 2rem; max-width: 580px; width: 100%; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-family: 'Outfit', sans-serif; font-weight: 700; color: #fff; }
    .btn-close { background: none; border: none; color: #A1A1AA; font-size: 1.5rem; cursor: pointer; }
  `]
})
export class ServicosPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly servicoService = inject(ServicoService);
  private readonly notification = inject(NotificationService);

  readonly servicos = signal<Servico[]>([]);
  readonly loading = signal(false);
  readonly enviando = signal(false);
  readonly exibirModal = signal(false);

  formServico = {
    nome: '',
    descricao: '',
    precoBase: 0,
  };

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.servicoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => {
        this.servicos.set(lista);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  abrirModalNovo(): void {
    this.formServico = { nome: '', descricao: '', precoBase: 0 };
    this.exibirModal.set(true);
  }

  salvar(): void {
    if (!this.formServico.nome.trim()) return;
    this.enviando.set(true);
    this.servicoService.criar(this.formServico).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enviando.set(false);
        this.exibirModal.set(false);
        this.notification.success('Serviço Cadastrado', 'Novo serviço incluído no catálogo.');
        this.carregar();
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }
}
