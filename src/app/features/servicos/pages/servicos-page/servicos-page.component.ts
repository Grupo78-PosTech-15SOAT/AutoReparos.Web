import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicoService } from '../../services/servico.service';
import { Servico } from '../../models/servico.model';
import { NotificationService } from '../../../../core/ui/notification.service';
import { AuthService } from '../../../auth/services/auth.service';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';

@Component({
  selector: 'app-servicos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, PageContainerComponent, ModalDialogComponent],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">Catálogo de Serviços</h1>
        </div>
        @if (isAdministrador()) {
          <button type="button" (click)="abrirModalNovo()" class="btn btn-primary" data-testid="btn-novo-servico">
            + Novo Serviço
          </button>
        }
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
              <th style="text-align: center;">Preço Unitário</th>
            </tr>
          </thead>
          <tbody>
            @for (s of servicos(); track s.id ?? s.nome) {
              <tr>
                <td>
                  <div style="font-weight: 600;">{{ s.nome }}</div>
                  @if (s.descricao) {
                    <div style="font-size: 0.75rem; color: var(--text-muted);">{{ s.descricao }}</div>
                  }
                </td>
                <td style="text-align: center;">
                  <span data-testid="preco-servico">R$ {{ (s.precoUnitario ?? s.precoBase ?? s.valorTabelado ?? 0) | number:'1.2-2' }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="2" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-modal-dialog
        [isOpen]="exibirModal()"
        title="Novo Serviço"
        (close)="exibirModal.set(false)"
      >
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
            <label class="form-label" for="servico-preco">Preço Unitário (R$)</label>
            <input id="servico-preco" type="number" step="0.01" [(ngModel)]="formServico.precoUnitario" name="precoUnitario" required class="form-control" />
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" (click)="exibirModal.set(false)" class="btn btn-secondary">Cancelar</button>
            <button type="submit" [disabled]="enviando() || !formServico.nome.trim()" class="btn btn-primary" data-testid="btn-salvar-servico">
              Salvar Serviço
            </button>
          </div>
        </form>
      </app-modal-dialog>
    </app-page-container>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
    .form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }
    .form-control {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      color: var(--text-main);
      outline: none;
    }
  `]
})
export class ServicosPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly servicoService = inject(ServicoService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly isAdministrador = computed(() => this.authService.currentUser()?.role === 'Administrador');

  readonly servicos = signal<Servico[]>([]);
  readonly loading = signal(false);
  readonly enviando = signal(false);
  readonly exibirModal = signal(false);

  formServico = {
    nome: '',
    descricao: '',
    precoUnitario: 0,
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
    this.formServico = { nome: '', descricao: '', precoUnitario: 0 };
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
