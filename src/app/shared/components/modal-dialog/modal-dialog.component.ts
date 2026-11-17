import { Component, ChangeDetectionStrategy, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="onBackdropClick($event)" role="dialog" aria-modal="true">
        <div class="modal-container" [class]="'size-' + size()">
          <header class="modal-header">
            <h3 class="modal-title">{{ title() }}</h3>
            <button
              type="button"
              class="btn-close"
              aria-label="Fechar"
              (click)="fechar()"
            >
              &times;
            </button>
          </header>

          <div class="modal-body">
            <ng-content></ng-content>
          </div>

          <footer class="modal-footer">
            <ng-content select="[modal-footer]"></ng-content>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-container {
      background: var(--bg-surface, #18181c);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: var(--radius-md, 12px);
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      animation: slideUp 0.2s ease-out;
      overflow: hidden;
    }

    .size-sm { max-width: 420px; }
    .size-md { max-width: 600px; }
    .size-lg { max-width: 860px; }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-main, #ffffff);
      margin: 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-muted, #9ca3af);
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm, 6px);
      transition: color 0.15s ease, background 0.15s ease;
    }

    .btn-close:hover {
      color: var(--text-main, #ffffff);
      background: rgba(255, 255, 255, 0.05);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      color: var(--text-main, #ffffff);
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      empty-cells: hide;
    }

    .modal-footer:empty {
      display: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ModalDialogComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  size = input<'sm' | 'md' | 'lg'>('md');
  close = output<void>();

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.fechar();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.fechar();
    }
  }

  fechar() {
    this.close.emit();
  }
}
