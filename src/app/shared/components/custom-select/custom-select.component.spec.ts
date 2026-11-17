import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomSelectComponent, SelectOption } from './custom-select.component';

const OPCOES: SelectOption[] = [
  { value: 'os-1', label: '#aaaaaaaa · ABC-1D23 · Gol 1.0', descricao: 'João da Silva · Recebida', palavrasChave: 'ABC-1D23 Volkswagen' },
  { value: 'os-2', label: '#bbbbbbbb · XYZ-9K88 · Onix', descricao: 'Maria Souza · Em Execução', palavrasChave: 'XYZ-9K88 Chevrolet' },
];

describe('CustomSelect', () => {
  let fixture: ComponentFixture<CustomSelectComponent>;
  let host: HTMLElement;

  function montar(opcoes: SelectOption[], buscaSempre: boolean): void {
    fixture = TestBed.createComponent(CustomSelectComponent);
    fixture.componentRef.setInput('options', opcoes);
    fixture.componentRef.setInput('buscaSempre', buscaSempre);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
  }

  function abrir(): void {
    (host.querySelector('.cs-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function painel(): HTMLElement | null {
    return document.body.querySelector('[data-testid="cs-painel"]');
  }

  function buscar(termo: string): string[] {
    const input = painel()!.querySelector('[data-testid="cs-busca"]') as HTMLInputElement;
    input.value = termo;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return Array.from(painel()!.querySelectorAll('[data-testid="cs-opcao"] .cs-option-label')).map(e => e.textContent!.trim());
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CustomSelectComponent] });
  });

  afterEach(() => {
    fixture?.destroy();
    host?.remove();
    document.body.querySelectorAll('[data-testid="cs-painel"]').forEach(p => p.remove());
  });

  describe('CustomSelect busca', () => {
    it('com buscaSempre mostra a busca mesmo com 2 opções', () => {
      montar(OPCOES, true);
      abrir();
      expect(painel()!.querySelector('[data-testid="cs-busca"]')).not.toBeNull();
    });

    it('sem buscaSempre e com até 6 opções não mostra a busca', () => {
      montar(OPCOES, false);
      abrir();
      expect(painel()!.querySelector('[data-testid="cs-busca"]')).toBeNull();
    });

    it('acha pela palavra-chave com placa sem máscara', () => {
      montar(OPCOES, true);
      abrir();
      expect(buscar('abc1d23')).toEqual(['#aaaaaaaa · ABC-1D23 · Gol 1.0']);
    });

    it('acha pelo rótulo sem diferenciar caixa', () => {
      montar(OPCOES, true);
      abrir();
      expect(buscar('gol')).toEqual(['#aaaaaaaa · ABC-1D23 · Gol 1.0']);
      expect(buscar('ONIX')).toEqual(['#bbbbbbbb · XYZ-9K88 · Onix']);
    });

    it('acha pela descrição ignorando acentos', () => {
      montar(OPCOES, true);
      abrir();
      expect(buscar('joao')).toEqual(['#aaaaaaaa · ABC-1D23 · Gol 1.0']);
      expect(buscar('execucao')).toEqual(['#bbbbbbbb · XYZ-9K88 · Onix']);
    });

    it('mostra a mensagem de vazio quando nada casa', () => {
      montar(OPCOES, true);
      abrir();
      expect(buscar('zzz')).toEqual([]);
      expect(painel()!.textContent).toContain('Nenhuma opção encontrada');
    });

    it('Enter na busca escolhe a primeira opção filtrada', () => {
      montar(OPCOES, true);
      const emitidos: string[] = [];
      fixture.componentInstance.valueChange.subscribe(v => emitidos.push(v));
      abrir();
      buscar('onix');
      const input = painel()!.querySelector('[data-testid="cs-busca"]') as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(emitidos).toEqual(['os-2']);
      expect(painel()).toBeNull();
    });
  });

  describe('CustomSelect painel', () => {
    it('ao abrir, o painel fica em document.body e fora do componente', () => {
      montar(OPCOES, true);
      abrir();
      const p = painel();
      expect(p).not.toBeNull();
      expect(p!.parentElement).toBe(document.body);
      expect(host.contains(p)).toBe(false);
    });

    it('clique numa opção emite o valor e fecha', () => {
      montar(OPCOES, true);
      const emitidos: string[] = [];
      fixture.componentInstance.valueChange.subscribe(v => emitidos.push(v));
      abrir();
      (painel()!.querySelectorAll('[data-testid="cs-opcao"]')[1] as HTMLElement).click();
      fixture.detectChanges();
      expect(emitidos).toEqual(['os-2']);
      expect(painel()).toBeNull();
    });

    it('clique na busca não fecha; clique fora do gatilho e do painel fecha', () => {
      montar(OPCOES, true);
      abrir();
      (painel()!.querySelector('[data-testid="cs-busca"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(painel()).not.toBeNull();

      const fora = document.createElement('div');
      document.body.appendChild(fora);
      fora.click();
      fixture.detectChanges();
      expect(painel()).toBeNull();
      fora.remove();
    });

    it('rolar a página fora do painel fecha', () => {
      montar(OPCOES, true);
      abrir();
      document.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      expect(painel()).toBeNull();
    });

    it('destruir o componente aberto remove o painel do body', () => {
      montar(OPCOES, true);
      abrir();
      expect(painel()).not.toBeNull();
      fixture.destroy();
      expect(painel()).toBeNull();
    });

    it('Esc fecha o painel', () => {
      montar(OPCOES, true);
      abrir();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(painel()).toBeNull();
    });
  });
});
