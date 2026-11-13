import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { CancelamentoResposta } from '../../models/ordem-servico.model';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo } from '../../../../core/http/error-catalog';

@Component({
  selector: 'app-os-cancelamento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section class="cancelamento card-panel">
      <h3 class="titulo">Cancelar OS</h3>
      <label class="form-label" for="motivo-cancelamento">Motivo do cancelamento</label>
      <textarea
        id="motivo-cancelamento"
        class="form-control"
        rows="3"
        [(ngModel)]="motivo"
        name="motivo"
        [disabled]="enviando()"
        placeholder="Informe o motivo..."
      ></textarea>

      <button type="button" class="btn btn-danger" (click)="cancelar()" [disabled]="enviando() || !motivo.trim()">
        {{ enviando() ? 'Cancelando...' : 'Cancelar OS' }}
      </button>

      @if (estado(); as texto) {
        <p class="resultado ok" role="status">Cancelamento aceito. Estado: {{ texto }}</p>
      }
      @if (erro(); as mensagem) {
        <p class="resultado erro" role="alert">{{ mensagem }}</p>
      }
    </section>
  `,
  styles: [`
    .cancelamento { display: flex; flex-direction: column; gap: 0.75rem; }
    .titulo { font-family: 'Outfit', sans-serif; font-size: 1.05rem; color: #ED145B; }
    .resultado { font-size: 0.9rem; margin: 0; }
    .ok { color: #10B981; }
    .erro { color: #F87171; }
  `]
})
export class OsCancelamentoComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);

  readonly osId = input.required<string>();
  /** Emitido quando o OS aceita o cancelamento, com o estado devolvido. */
  readonly cancelada = output<CancelamentoResposta>();

  motivo = '';
  readonly enviando = signal(false);
  readonly estado = signal<string | null>(null);
  readonly erro = signal<string | null>(null);

  cancelar() {
    const motivo = this.motivo.trim();
    if (!motivo) return;

    this.enviando.set(true);
    this.erro.set(null);
    this.estado.set(null);
    this.osService.cancelar(this.osId(), motivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resposta => {
        this.estado.set(resposta?.estado ?? resposta?.status ?? 'Cancelamento em andamento');
        this.enviando.set(false);
        this.cancelada.emit(resposta ?? {});
      },
      error: (e: HttpErrorResponse) => {
        const generica = MENSAGENS_POR_STATUS[e.status]?.mensagem ?? 'Não foi possível cancelar a OS.';
        this.erro.set(mensagemDoCodigo(e.error?.codigo, e.error?.mensagem ?? generica));
        this.enviando.set(false);
      }
    });
  }
}
