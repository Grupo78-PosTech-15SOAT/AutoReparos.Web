import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  /** Segunda linha, mais discreta (ex.: cliente e estado). */
  descricao?: string;
  /** Termos extras que entram na busca (ex.: id completo, placa sem máscara). */
  palavrasChave?: string;
}

/** Minúsculas e sem acentos. */
export function normalizarBusca(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Só letras e dígitos, para que "abc1d23" ache "ABC-1D23". */
function compactar(texto: string): string {
  return normalizarBusca(texto).replace(/[^a-z0-9]/g, '');
}

/** A opção casa com o termo pelo rótulo, pela descrição ou pelas palavras-chave. */
export function opcaoCasaComBusca(opcao: SelectOption, termo: string): boolean {
  const normalizado = normalizarBusca(termo);
  if (!normalizado) return true;
  const alvo = [opcao.label, opcao.descricao ?? '', opcao.palavrasChave ?? ''].join(' ');
  if (normalizarBusca(alvo).includes(normalizado)) return true;
  const compacto = compactar(termo);
  return compacto.length > 0 && compactar(alvo).includes(compacto);
}

const ALTURA_MAX_PAINEL = 320;
const MARGEM_PAINEL = 6;

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cs-wrapper" [class.cs-open]="isOpen()" [class.cs-loading]="loading()" [class.cs-disabled]="disabled()">
      <button
        #gatilho
        type="button"
        class="cs-trigger"
        (click)="toggle()"
        [disabled]="disabled() || loading()"
        [attr.id]="idGatilho() || null"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
        [attr.aria-label]="idGatilho() ? null : placeholder()"
      >
        @if (loading()) {
          <span class="cs-spinner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"/>
            </svg>
          </span>
          <span class="cs-loading-text">Carregando...</span>
        } @else {
          <span class="cs-value" [class.cs-placeholder]="!selectedLabel()">
            {{ selectedLabel() || placeholder() }}
          </span>
          <span class="cs-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        }
      </button>

      @if (isOpen() && !loading()) {
        <!-- O painel é movido para document.body ao abrir (escapa de cards, modais e drawers). -->
        <div #painel class="cs-dropdown" [class.cs-para-cima]="paraCima()" data-testid="cs-painel" role="listbox">
          @if (mostrarBusca()) {
            <div class="cs-search-wrapper">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                #searchInput
                type="text"
                class="cs-search"
                [placeholder]="placeholderBusca()"
                [ngModel]="searchTerm()"
                (ngModelChange)="mudarBusca($event)"
                (keydown.enter)="selecionarPrimeira($event)"
                aria-label="Buscar opções"
                data-testid="cs-busca"
              />
            </div>
          }

          <div class="cs-list">
            @if (mostrarOpcaoVazia()) {
              <div
                class="cs-option cs-option-placeholder"
                [class.cs-selected]="!value()"
                (click)="select('')"
              >
                {{ placeholder() }}
              </div>
            }

            @for (opt of filteredOptions(); track opt.value) {
              <div
                class="cs-option"
                role="option"
                [attr.aria-selected]="opt.value === value()"
                [class.cs-selected]="opt.value === value()"
                (click)="select(opt.value)"
                data-testid="cs-opcao"
              >
                @if (opt.value === value()) {
                  <svg class="cs-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                }
                <span class="cs-option-textos">
                  <span class="cs-option-label">{{ opt.label }}</span>
                  @if (opt.descricao) {
                    <span class="cs-option-descricao">{{ opt.descricao }}</span>
                  }
                </span>
              </div>
            } @empty {
              <div class="cs-empty">{{ textoVazio() }}</div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cs-wrapper {
      position: relative;
      width: 100%;
    }

    .cs-trigger {
      width: 100%;
      min-height: var(--control-h, 2.75rem);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 8px);
      padding: 0.6rem 0.9rem;
      color: var(--text-main);
      font-size: 0.9rem;
      font-family: var(--font-body);
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      text-align: left;
    }

    .cs-trigger:hover:not(:disabled) {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .cs-open .cs-trigger,
    .cs-trigger:focus-visible {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-subtle);
    }

    .cs-trigger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cs-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cs-placeholder {
      color: var(--text-subtle);
    }

    .cs-arrow {
      color: var(--text-subtle);
      transition: transform 0.2s ease;
      flex-shrink: 0;
      line-height: 0;
    }

    .cs-open .cs-arrow {
      transform: rotate(180deg);
      color: var(--primary);
    }

    .cs-spinner svg {
      animation: cs-spin 0.8s linear infinite;
      color: var(--primary);
    }

    .cs-loading-text {
      color: var(--text-subtle);
      font-size: 0.9rem;
      flex: 1;
    }

    @keyframes cs-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Painel (vive em document.body, posição calculada pelo componente) */
    .cs-dropdown {
      position: fixed;
      z-index: 3000;
      display: flex;
      flex-direction: column;
      max-height: 320px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      font-family: var(--font-body);
      animation: cs-entrar 0.14s ease-out;
    }

    @keyframes cs-entrar {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .cs-search-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 0.85rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-subtle);
      flex-shrink: 0;
    }

    .cs-search {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-main);
      font-size: 0.875rem;
      font-family: var(--font-body);
    }

    .cs-search::placeholder { color: var(--text-subtle); }

    .cs-list {
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: #3F3F46 transparent;
    }

    .cs-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 0.9rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease;
    }

    .cs-option:hover {
      background: var(--bg-surface-hover);
      color: var(--text-main);
    }

    .cs-option-textos {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .cs-option-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cs-option-descricao {
      font-size: 0.75rem;
      color: var(--text-subtle);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cs-option-placeholder {
      color: var(--text-subtle);
      font-style: italic;
    }

    .cs-option.cs-selected {
      background: var(--primary-subtle);
      color: var(--text-main);
      font-weight: 600;
    }

    .cs-check {
      flex-shrink: 0;
      color: var(--primary);
    }

    .cs-empty {
      padding: 1.1rem;
      text-align: center;
      color: var(--text-subtle);
      font-size: 0.85rem;
    }
  `]
})
export class CustomSelectComponent {
  options = input<SelectOption[]>([]);
  value = input<string>('');
  placeholder = input<string>('-- Selecione --');
  placeholderBusca = input<string>('Filtrar...');
  loading = input<boolean>(false);
  disabled = input<boolean>(false);
  searchable = input<boolean>(true);
  /** Mostra a busca com qualquer número de opções (por padrão só com mais de 6). */
  buscaSempre = input<boolean>(false);
  /** Mostra a opção vazia (placeholder) no topo da lista. */
  permitirVazio = input<boolean>(true);
  textoVazio = input<string>('Nenhuma opção encontrada');
  dropUp = input<boolean>(false);
  /** Id do botão gatilho, para ligar o `<label for>`. */
  idGatilho = input<string>('');

  valueChange = output<string>();
  buscaMudou = output<string>();

  isOpen = signal(false);
  searchTerm = signal('');
  paraCima = signal(false);

  selectedLabel = computed(() => {
    const found = this.options().find(o => o.value === this.value());
    return found ? found.label : '';
  });

  mostrarBusca = computed(() => this.searchable() && (this.buscaSempre() || this.options().length > 6));

  mostrarOpcaoVazia = computed(() => this.permitirVazio() && !normalizarBusca(this.searchTerm()));

  filteredOptions = computed(() => {
    const termo = this.searchTerm();
    return this.options().filter(o => opcaoCasaComBusca(o, termo));
  });

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly gatilho = viewChild<ElementRef<HTMLButtonElement>>('gatilho');
  private readonly painel = viewChild<ElementRef<HTMLElement>>('painel');
  private readonly busca = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private painelAnexado: HTMLElement | null = null;

  private readonly aoRolar = (event: Event) => {
    if (!this.isOpen()) return;
    const alvo = event.target as Node | null;
    if (alvo && this.painelAnexado?.contains(alvo)) return;
    this.isOpen.set(false);
  };

  constructor() {
    effect(() => {
      const painel = this.painel()?.nativeElement ?? null;
      if (painel && painel !== this.painelAnexado) {
        this.document.body.appendChild(painel);
        this.painelAnexado = painel;
        this.posicionar();
        this.busca()?.nativeElement.focus();
      } else if (!painel) {
        this.painelAnexado = null;
      }
    });

    this.document.addEventListener('scroll', this.aoRolar, true);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('scroll', this.aoRolar, true);
      this.painelAnexado?.remove();
      this.painelAnexado = null;
    });
  }

  toggle() {
    if (this.disabled() || this.loading()) return;
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.searchTerm.set('');
    }
  }

  mudarBusca(termo: string) {
    this.searchTerm.set(termo ?? '');
    this.buscaMudou.emit(termo ?? '');
  }

  selecionarPrimeira(event: Event) {
    event.preventDefault();
    const primeira = this.filteredOptions()[0];
    if (primeira) this.select(primeira.value);
  }

  select(val: string) {
    this.isOpen.set(false);
    this.valueChange.emit(val);
  }

  /** Posiciona o painel (fixo) sob o gatilho, ou acima quando não cabe embaixo. */
  posicionar() {
    const painel = this.painelAnexado;
    const gatilho = this.gatilho()?.nativeElement;
    if (!painel || !gatilho) return;
    const rect = gatilho.getBoundingClientRect();
    const alturaJanela = this.document.defaultView?.innerHeight ?? 0;
    const espacoAbaixo = alturaJanela - rect.bottom;
    const abrirParaCima = this.dropUp() || (espacoAbaixo < ALTURA_MAX_PAINEL && rect.top > espacoAbaixo);
    this.paraCima.set(abrirParaCima);

    painel.style.left = `${Math.max(rect.left, 8)}px`;
    painel.style.width = `${Math.max(rect.width, 240)}px`;
    if (abrirParaCima) {
      painel.style.top = '';
      painel.style.bottom = `${alturaJanela - rect.top + MARGEM_PAINEL}px`;
      painel.style.maxHeight = `${Math.min(ALTURA_MAX_PAINEL, Math.max(rect.top - 16, 160))}px`;
    } else {
      painel.style.bottom = '';
      painel.style.top = `${rect.bottom + MARGEM_PAINEL}px`;
      painel.style.maxHeight = `${Math.min(ALTURA_MAX_PAINEL, Math.max(espacoAbaixo - 16, 160))}px`;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isOpen()) this.posicionar();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const alvo = event.target as Node | null;
    const dentroDoGatilho = !!alvo && this.el.nativeElement.contains(alvo);
    const dentroDoPainel = !!alvo && !!this.painelAnexado?.contains(alvo);
    if (!dentroDoGatilho && !dentroDoPainel) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.isOpen.set(false);
  }
}
