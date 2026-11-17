import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';

export const TAMANHO_ID_CURTO = 8;
export const TEMPO_COPIADO_MS = 1500;

/** `#` + 8 primeiros caracteres do id (ids curtos saem inteiros). */
export function idCurto(id: string | null | undefined): string {
  const limpo = (id ?? '').trim().replace(/^#/, '');
  return limpo ? `#${limpo.slice(0, TAMANHO_ID_CURTO)}` : '—';
}

/** Id curto em fonte mono, com o id completo no tooltip e botão de copiar. */
@Component({
  selector: 'app-id-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge-id" [class]="size()" [attr.title]="completo()">
      <span class="badge-id-texto">{{ curto() }}</span>
      @if (copiavel() && completo()) {
        <button
          type="button"
          class="badge-id-copiar"
          [class.copiado]="copiado()"
          (click)="copiar($event)"
          [attr.aria-label]="copiado() ? 'Copiado' : 'Copiar código ' + completo()"
          data-testid="id-badge-copiar"
        >
          @if (copiado()) {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            <span class="badge-id-feedback">Copiado</span>
          } @else {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          }
        </button>
      }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    .badge-id {
      font-family: var(--font-mono);
      background: var(--mono-badge-bg);
      color: var(--mono-text);
      border: 1px solid var(--border-color);
      font-weight: 600;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      white-space: nowrap;
      letter-spacing: 0.02em;
    }
    .badge-id.sm { font-size: 0.7rem; padding: 0.05rem 0.3rem 0.05rem 0.4rem; }
    .badge-id.md { font-size: 0.78rem; padding: 0.15rem 0.35rem 0.15rem 0.5rem; }
    .badge-id.lg { font-size: 0.95rem; padding: 0.25rem 0.5rem 0.25rem 0.7rem; }
    .badge-id-copiar {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      background: transparent;
      border: none;
      color: var(--text-subtle);
      cursor: pointer;
      padding: 0.1rem;
      border-radius: 4px;
      font: inherit;
      font-size: 0.7rem;
    }
    .badge-id-copiar:hover { color: var(--text-main); background: rgba(255, 255, 255, 0.08); }
    .badge-id-copiar:focus-visible { outline: 2px solid var(--border-focus); }
    .badge-id-copiar.copiado { color: var(--success); }
    .badge-id-feedback { font-family: var(--font-body); }
  `]
})
export class IdBadgeComponent {
  /** Id completo; a exibição corta para `#` + 8 caracteres. */
  text = input.required<string>();
  size = input<'sm' | 'md' | 'lg'>('md');
  copiavel = input(true);

  readonly completo = computed(() => (this.text() ?? '').trim().replace(/^#/, ''));
  readonly curto = computed(() => idCurto(this.text()));
  readonly copiado = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
    });
  }

  async copiar(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const valor = this.completo();
    if (!valor) return;
    try {
      await navigator.clipboard?.writeText(valor);
    } catch {
      return;
    }
    this.copiado.set(true);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copiado.set(false), TEMPO_COPIADO_MS);
  }
}
