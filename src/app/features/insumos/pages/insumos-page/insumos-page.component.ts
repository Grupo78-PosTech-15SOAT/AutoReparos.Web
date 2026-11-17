import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { InsumoService } from '../../services/insumo.service';
import { Insumo } from '../../models/insumo.model';
import { NotificationService } from '../../../../core/ui/notification.service';
import { AuthService } from '../../../auth/services/auth.service';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { MoedaPipe } from '../../../../shared/pipes/moeda.pipe';

@Component({
  selector: 'app-insumos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageContainerComponent, ModalDialogComponent, MoedaPipe],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">Estoque de Insumos</h1>
        </div>
        @if (isAdministrador()) {
          <button type="button" (click)="abrirModalNovo()" class="btn btn-primary" data-testid="btn-novo-insumo">
            + Novo Insumo
          </button>
        }
      </div>

      <div class="data-table-container table-loading-container">
        @if (loading()) {
          <div class="table-loading-overlay" role="status">
            <span class="table-loading-text">Carregando insumos...</span>
          </div>
        }
        <table class="data-table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th style="text-align: center;">Preço Unitário</th>
              <th style="text-align: center;">Saldo Disponível</th>
              <th style="text-align: center;">Saldo Reservado</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (item of insumos(); track item.id ?? item.nome) {
              <tr>
                <td>
                  <div style="font-weight: 600;">{{ item.nome }}</div>
                  @if (item.descricao) {
                    <div class="text-muted" style="font-size: 0.75rem;">{{ item.descricao }}</div>
                  }
                </td>
                <td style="text-align: center;">
                  <span data-testid="preco-insumo">{{ (item.precoUnitario ?? item.valor ?? 0) | moeda }}</span>
                </td>
                <td style="text-align: center;" data-testid="saldo-disponivel">
                  <span>{{ item.quantidadeDisponivel ?? item.saldoDisponivel ?? item.quantidadeEstoque ?? 0 }}</span>
                </td>
                <td style="text-align: center;" data-testid="saldo-reservado">
                  <span>{{ item.quantidadeReservada ?? item.saldoReservado ?? 0 }}</span>
                </td>
                <td class="col-acoes">
                  @if (canRegistrarEntrada()) {
                    <button
                      type="button"
                      (click)="abrirModalEntrada(item)"
                      class="btn btn-ghost btn-sm"
                      data-testid="btn-registrar-entrada"
                    >
                      + Registrar Entrada
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty-state">
                  Nenhum insumo cadastrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-modal-dialog
        [isOpen]="exibirModalNovo()"
        title="Novo Insumo"
        (close)="exibirModalNovo.set(false)"
      >
        <form (ngSubmit)="salvarNovo()">
          <div class="form-group">
            <label class="form-label" for="insumo-nome">Nome</label>
            <input id="insumo-nome" type="text" [(ngModel)]="formInsumo.nome" name="nome" required class="form-control" />
          </div>

          <div class="form-group">
            <label class="form-label" for="insumo-descricao">Descrição</label>
            <input id="insumo-descricao" type="text" [(ngModel)]="formInsumo.descricao" name="descricao" class="form-control" />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="insumo-preco">Preço Unitário (R$)</label>
              <input id="insumo-preco" type="number" step="0.01" [(ngModel)]="formInsumo.precoUnitario" name="precoUnitario" required class="form-control" />
            </div>

            <div class="form-group">
              <label class="form-label" for="insumo-saldo">Saldo Inicial</label>
              <input id="insumo-saldo" type="number" [(ngModel)]="formInsumo.quantidadeInicial" name="quantidadeInicial" required class="form-control" />
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" (click)="exibirModalNovo.set(false)" class="btn btn-secondary">Cancelar</button>
            <button type="submit" [disabled]="enviando() || !formInsumo.nome.trim()" class="btn btn-primary" data-testid="btn-salvar-insumo">
              Salvar Insumo
            </button>
          </div>
        </form>
      </app-modal-dialog>

      <app-modal-dialog
        [isOpen]="!!insumoEntrada()"
        [title]="'Registrar Entrada: ' + (insumoEntrada()?.nome ?? '')"
        (close)="fecharModalEntrada()"
      >
        <form (ngSubmit)="confirmarEntrada()">
          <div class="form-group">
            <label class="form-label" for="entrada-quantidade">Quantidade</label>
            <input id="entrada-quantidade" type="number" min="1" [(ngModel)]="formEntrada.quantidade" name="quantidade" required class="form-control" />
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" (click)="fecharModalEntrada()" class="btn btn-secondary">Cancelar</button>
            <button type="submit" [disabled]="enviando() || formEntrada.quantidade <= 0" class="btn btn-primary" data-testid="btn-confirmar-entrada">
              Confirmar Entrada
            </button>
          </div>
        </form>
      </app-modal-dialog>
    </app-page-container>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
  `]
})
export class InsumosPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly insumoService = inject(InsumoService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly isAdministrador = computed(() => this.authService.currentUser()?.role === 'Administrador');
  readonly canRegistrarEntrada = computed(() => ['Administrador', 'Atendente'].includes(this.authService.currentUser()?.role ?? ''));

  readonly insumos = signal<Insumo[]>([]);
  readonly loading = signal(false);
  readonly enviando = signal(false);
  readonly exibirModalNovo = signal(false);
  readonly insumoEntrada = signal<Insumo | null>(null);

  formInsumo = {
    nome: '',
    descricao: '',
    precoUnitario: 0,
    quantidadeInicial: 0,
  };

  formEntrada = {
    quantidade: 1,
  };

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.insumoService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => {
        this.insumos.set(lista);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  abrirModalNovo(): void {
    this.formInsumo = { nome: '', descricao: '', precoUnitario: 0, quantidadeInicial: 0 };
    this.exibirModalNovo.set(true);
  }

  salvarNovo(): void {
    if (!this.formInsumo.nome.trim()) return;
    this.enviando.set(true);
    this.insumoService.criar(this.formInsumo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enviando.set(false);
        this.exibirModalNovo.set(false);
        this.notification.success('Insumo Cadastrado', 'Novo insumo incluído no estoque.');
        this.carregar();
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }

  abrirModalEntrada(item: Insumo): void {
    this.insumoEntrada.set(item);
    this.formEntrada = { quantidade: 1 };
  }

  fecharModalEntrada(): void {
    this.insumoEntrada.set(null);
  }

  confirmarEntrada(): void {
    const alvo = this.insumoEntrada();
    if (!alvo?.id || this.formEntrada.quantidade <= 0) return;

    this.enviando.set(true);
    this.insumoService.registrarEntrada(alvo.id, {
      quantidade: Number(this.formEntrada.quantidade),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enviando.set(false);
        this.insumoEntrada.set(null);
        this.notification.success('Entrada Registrada', 'Saldo atualizado com sucesso.');
        this.carregar();
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }
}
