import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdBadgeComponent, TEMPO_COPIADO_MS } from './id-badge.component';

const ID = '3f2a9c1e-4b5d-4e6f-8a9b-0c1d2e3f4a5b';

describe('IdBadge', () => {
  let fixture: ComponentFixture<IdBadgeComponent>;

  function montar(texto: string): HTMLElement {
    fixture = TestBed.createComponent(IdBadgeComponent);
    fixture.componentRef.setInput('text', texto);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IdBadgeComponent] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('IdBadge corte', () => {
    it('mostra # e os 8 primeiros caracteres com o id completo no title', () => {
      const el = montar(ID);
      const badge = el.querySelector('.badge-id') as HTMLElement;
      expect(el.querySelector('.badge-id-texto')?.textContent?.trim()).toBe('#3f2a9c1e');
      expect(badge.getAttribute('title')).toBe(ID);
    });

    it('id com 6 caracteres sai inteiro', () => {
      const el = montar('abc123');
      expect(el.querySelector('.badge-id-texto')?.textContent?.trim()).toBe('#abc123');
    });

    it('aceita id já prefixado com #', () => {
      const el = montar('#' + ID.slice(0, 8));
      expect(el.querySelector('.badge-id-texto')?.textContent?.trim()).toBe('#3f2a9c1e');
    });
  });

  describe('IdBadge copia', () => {
    it('copia o id completo e mostra "Copiado" por 1,5 s', async () => {
      vi.useFakeTimers();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      const el = montar(ID);
      (el.querySelector('[data-testid="id-badge-copiar"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(writeText).toHaveBeenCalledWith(ID);
      expect(el.querySelector('.badge-id-feedback')?.textContent?.trim()).toBe('Copiado');

      vi.advanceTimersByTime(TEMPO_COPIADO_MS - 1);
      fixture.detectChanges();
      expect(el.querySelector('.badge-id-feedback')).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(el.querySelector('.badge-id-feedback')).toBeNull();
      expect(TEMPO_COPIADO_MS).toBe(1500);
    });

    it('não mostra "Copiado" quando a área de transferência recusa', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('negado'));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const el = montar(ID);
      (el.querySelector('[data-testid="id-badge-copiar"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();
      expect(el.querySelector('.badge-id-feedback')).toBeNull();
    });
  });
});
