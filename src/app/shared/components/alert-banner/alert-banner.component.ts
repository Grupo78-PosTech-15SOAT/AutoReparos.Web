import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertBannerTipo = 'info' | 'sucesso' | 'aviso' | 'erro';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert-banner" [class]="'tipo-' + tipo()" role="alert">
      <div class="alert-icon" aria-hidden="true">
        @switch (tipo()) {
          @case ('sucesso') {
            <svg viewBox="0 0 20 20" fill="currentColor" class="icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          }
          @case ('aviso') {
            <svg viewBox="0 0 20 20" fill="currentColor" class="icon">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          }
          @case ('erro') {
            <svg viewBox="0 0 20 20" fill="currentColor" class="icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          }
          @default {
            <svg viewBox="0 0 20 20" fill="currentColor" class="icon">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          }
        }
      </div>

      <div class="alert-content">
        @if (titulo()) {
          <h4 class="alert-title">{{ titulo() }}</h4>
        }
        @if (mensagem()) {
          <p class="alert-message">{{ mensagem() }}</p>
        }
        <ng-content></ng-content>
      </div>

      @if (dismissible()) {
        <button
          type="button"
          class="alert-dismiss"
          aria-label="Dispensar aviso"
          (click)="dispensar()"
        >
          &times;
        </button>
      }
    </div>
  `,
  styles: [`
    .alert-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 0.875rem 1rem;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      background: var(--bg-card, rgba(255, 255, 255, 0.03));
      color: var(--text-main, #ffffff);
      margin-bottom: 1rem;
    }

    .alert-icon {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .tipo-info {
      border-left: 4px solid var(--accent-cyan, #06b6d4);
    }
    .tipo-info .icon { color: var(--accent-cyan, #06b6d4); }

    .tipo-sucesso {
      border-left: 4px solid var(--accent-green, #10b981);
    }
    .tipo-sucesso .icon { color: var(--accent-green, #10b981); }

    .tipo-aviso {
      border-left: 4px solid var(--accent-yellow, #f59e0b);
    }
    .tipo-aviso .icon { color: var(--accent-yellow, #f59e0b); }

    .tipo-erro {
      border-left: 4px solid var(--primary, #ec4899);
    }
    .tipo-erro .icon { color: var(--primary, #ec4899); }

    .alert-content {
      flex: 1;
      min-width: 0;
    }

    .alert-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
      color: var(--text-main, #ffffff);
    }

    .alert-message {
      font-size: 0.875rem;
      margin: 0;
      color: var(--text-muted, #9ca3af);
      line-height: 1.4;
    }

    .alert-dismiss {
      background: transparent;
      border: none;
      color: var(--text-muted, #9ca3af);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 0.25rem;
      margin-left: auto;
    }

    .alert-dismiss:hover {
      color: var(--text-main, #ffffff);
    }
  `]
})
export class AlertBannerComponent {
  tipo = input<AlertBannerTipo>('info');
  titulo = input<string | undefined>();
  mensagem = input<string | undefined>();
  dismissible = input<boolean>(false);
  dismiss = output<void>();

  dispensar() {
    this.dismiss.emit();
  }
}
