import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OsJornadaStore, CHAVE_JORNADA_OS } from './os-jornada.store';
import { STORAGE_TOKEN } from '../tokens/storage.token';

describe('OsJornadaStore', () => {
  let store: OsJornadaStore;
  let mockStorage: Storage;
  let storageMap: Map<string, string>;

  beforeEach(() => {
    storageMap = new Map<string, string>();
    mockStorage = {
      get length() { return storageMap.size; },
      clear: () => storageMap.clear(),
      getItem: (k: string) => storageMap.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { storageMap.delete(k); },
      setItem: (k: string, v: string) => { storageMap.set(k, v); },
    };

    TestBed.configureTestingModule({
      providers: [
        OsJornadaStore,
        { provide: STORAGE_TOKEN, useValue: mockStorage }
      ]
    });

    store = TestBed.inject(OsJornadaStore);
  });

  it('deve inicializar vazio se não houver dados no storage', () => {
    expect(store.registros()).toEqual([]);
  });

  it('deve salvar e recuperar registro por osId', () => {
    const reg = store.salvar({
      osId: 'os-1',
      clienteId: 'cli-1',
      veiculoId: 'vei-1'
    });

    expect(reg.osId).toBe('os-1');
    expect(store.obter('os-1')?.clienteId).toBe('cli-1');
    expect(storageMap.has(CHAVE_JORNADA_OS)).toBe(true);
  });

  it('deve atualizar registro existente preservando dados anteriores', () => {
    store.salvar({ osId: 'os-1', clienteId: 'cli-1' });
    store.salvar({ osId: 'os-1', orcamentoId: 'orc-10', pagamentoId: 'pag-20' });

    const atual = store.obter('os-1');
    expect(atual?.clienteId).toBe('cli-1');
    expect(atual?.orcamentoId).toBe('orc-10');
    expect(atual?.pagamentoId).toBe('pag-20');
  });

  it('deve recuperar registro por orcamentoId e por pagamentoId', () => {
    store.salvar({ osId: 'os-1', orcamentoId: 'orc-10', pagamentoId: 'pag-20' });

    expect(store.obterPorOrcamento('orc-10')?.osId).toBe('os-1');
    expect(store.obterPorPagamento('pag-20')?.osId).toBe('os-1');
  });

  it('deve limitar a lista a 100 registros recentes', () => {
    for (let i = 0; i < 110; i++) {
      store.salvar({ osId: `os-${i}` });
    }
    expect(store.registros().length).toBe(100);
  });

  it('deve limpar registros e remover chave do storage', () => {
    store.salvar({ osId: 'os-1' });
    expect(store.registros().length).toBe(1);

    store.limpar();
    expect(store.registros()).toEqual([]);
    expect(storageMap.get(CHAVE_JORNADA_OS)).toBeUndefined();
  });
});
