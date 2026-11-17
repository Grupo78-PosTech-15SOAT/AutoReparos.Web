import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ModoDataHora, dataHoraCompleta, formatarDataHora, paraData } from '../../utils/data-hora.utils';

/** Data e hora em pt-BR com o valor completo no tooltip. */
@Component({
  selector: 'app-data-hora',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (iso(); as dt) {
      <time class="data-hora" [attr.datetime]="dt" [attr.title]="titulo()">{{ texto() }}</time>
    } @else {
      <span class="data-hora vazia">—</span>
    }
  `,
  styles: [`
    :host { display: inline-flex; }
    .data-hora {
      color: var(--text-muted);
      font-size: 0.82rem;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .vazia { color: var(--text-subtle); }
  `],
})
export class DataHoraComponent {
  valor = input<string | Date | null | undefined>(null);
  modo = input<ModoDataHora>('relativo');

  readonly iso = computed(() => paraData(this.valor())?.toISOString() ?? null);
  readonly texto = computed(() => formatarDataHora(this.valor(), this.modo()));
  readonly titulo = computed(() => dataHoraCompleta(this.valor()));
}
