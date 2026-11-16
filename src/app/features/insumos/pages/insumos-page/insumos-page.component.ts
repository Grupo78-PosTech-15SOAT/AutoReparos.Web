import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsumoService } from '../../services/insumo.service';
import { Insumo } from '../../models/insumo.model';
import { NotificationService } from '../../../../core/ui/notification.service';

@Component({
  selector: 'app-insumos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="container fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Estoque de Insumos</h1>
        </div>
        <button type="button" (click)="abrirModalNovo()" class="btn btn-primary" data-testid="btn-novo-insumo">
          + Novo Insumo
        </button>
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (item of insumos(); track item.id ?? item.nome) {
              <tr>
                <td>
                  <div style="font-weight: 600;">{{ item.nome }}</div>
                  @if (item.descricao) {
                    <div style="font-size: 0.75rem; color: #A1A1AA;">{{ item.descricao }}</div>
                  }
                </td>
                <td style="text-align: center;">
                  <span>R$ {{ (item.precoUnitario ?? item.valor ?? 0) | number:'1.2-2' }}</span>
                </td>
                <td style="text-align: center;" data-testid="saldo-disponivel">
                  <span>{{ item.saldoDisponivel ?? item.quantidadeEstoque ?? 0 }}</span>
                </td>
                <td style="text-align: center;" data-testid="saldo-reservado">
                  <span>{{ item.saldoReservado ?? 0 }}</span>
                </td>
                <td>
                  <button
                    type="button"
                    (click)="abrirModalEntrada(item)"
                    class="btn btn-secondary btn-sm"
                    data-testid="btn-registrar-entrada"
                  >
                    + Registrar Entrada
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" style="text-align: center; padding: 2.5rem; color: #71717A;">
                  Nenhum insumo cadastrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (exibirModalNovo()) {
        <div class="modal-backdrop fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <h3>Novo Insumo</h3>
              <button type="button" (click)="exibirModalNovo.set(false)" class="btn-close">&times;</button>
            </div>

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
                  <input id="insumo-saldo" type="number" [(ngModel)]="formInsumo.saldoDisponivel" name="saldoDisponivel" required class="form-control" />
                </div>
              </div>

              <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                <button type="button" (click)="exibirModalNovo.set(false)" class="btn btn-secondary">Cancelar</button>
                <button type="submit" [disabled]="enviando() || !formInsumo.nome.trim()" class="btn btn-primary">
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (insumoEntrada(); as alvo) {
        <div class="modal-backdrop fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <h3>Registrar Entrada: {{ alvo.nome }}</h3>
              <button type="button" (click)="fecharModalEntrada()" class="btn-close">&times;</button>
            </div>

            <form (ngSubmit)="confirmarEntrada()">
              <div class="form-group">
                <label class="form-label" for="entrada-quantidade">Quantidade</label>
                <input id="entrada-quantidade" type="number" min="1" [(ngModel)]="formEntrada.quantidade" name="quantidade" required class="form-control" />
              </div>

              <div class="form-group">
                <label class="form-label" for="entrada-motivo">Motivo</label>
                <input id="entrada-motivo" type="text" [(ngModel)]="formEntrada.motivo" name="motivo" required class="form-control" />
              </div>

              <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                <button type="button" (click)="fecharModalEntrada()" class="btn btn-secondary">Cancelar</button>
                <button type="submit" [disabled]="enviando() || formEntrada.quantidade <= 0 || !formEntrada.motivo.trim()" class="btn btn-primary">
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.8rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 12, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { background: #18181C; border: 1px solid rgba(237, 20, 91, 0.3); border-radius: 12px; padding: 2rem; max-width: 580px; width: 100%; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .modal-header h3 { font-family: 'Outfit', sans-serif; font-weight: 700; color: #fff; }
    .btn-close { background: none; border: none; color: #A1A1AA; font-size: 1.5rem; cursor: pointer; }
  `]
})
export class InsumosPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly insumoService = inject(InsumoService);
  private readonly notification = inject(NotificationService);

  readonly insumos = signal<Insumo[]>([]);
  readonly loading = signal(false);
  readonly enviando = signal(false);
  readonly exibirModalNovo = signal(false);
  readonly insumoEntrada = signal<Insumo | null>(null);

  formInsumo = {
    nome: '',
    descricao: '',
    precoUnitario: 0,
    saldoDisponivel: 0,
  };

  formEntrada = {
    quantidade: 1,
    motivo: '',
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
    this.formInsumo = { nome: '', descricao: '', precoUnitario: 0, saldoDisponivel: 0 };
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
    this.formEntrada = { quantidade: 1, motivo: '' };
  }

  fecharModalEntrada(): void {
    this.insumoEntrada.set(null);
  }

  confirmarEntrada(): void {
    const alvo = this.insumoEntrada();
    if (!alvo?.id || this.formEntrada.quantidade <= 0 || !this.formEntrada.motivo.trim()) return;

    this.enviando.set(true);
    this.insumoService.registrarEntrada(alvo.id, {
      quantidade: Number(this.formEntrada.quantidade),
      motivo: this.formEntrada.motivo.trim(),
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
