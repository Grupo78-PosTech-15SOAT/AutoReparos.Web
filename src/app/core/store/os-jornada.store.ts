import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_TOKEN } from '../tokens/storage.token';

export interface RegistroJornadaOs {
  osId: string;
  clienteId?: string;
  veiculoId?: string;
  orcamentoId?: string;
  pagamentoId?: string;
  atualizadoEm: string;
}

export const CHAVE_JORNADA_OS = 'autoreparos_os_jornada_v1';
const MAX_REGISTROS = 100;

@Injectable({
  providedIn: 'root'
})
export class OsJornadaStore {
  private readonly storage = inject(STORAGE_TOKEN);
  private readonly _registros = signal<RegistroJornadaOs[]>(this.carregarInicial());

  readonly registros = this._registros.asReadonly();

  obter(osId: string): RegistroJornadaOs | undefined {
    return this._registros().find(r => r.osId === osId);
  }

  obterPorOrcamento(orcamentoId: string): RegistroJornadaOs | undefined {
    return this._registros().find(r => r.orcamentoId === orcamentoId);
  }

  obterPorPagamento(pagamentoId: string): RegistroJornadaOs | undefined {
    return this._registros().find(r => r.pagamentoId === pagamentoId);
  }

  salvar(parcial: Partial<RegistroJornadaOs> & { osId: string }): RegistroJornadaOs {
    const atual = this.obter(parcial.osId);
    const atualizado: RegistroJornadaOs = {
      ...(atual ?? {}),
      ...parcial,
      atualizadoEm: new Date().toISOString()
    };

    const filtrados = this._registros().filter(r => r.osId !== parcial.osId);
    const novaLista = [atualizado, ...filtrados].slice(0, MAX_REGISTROS);

    this._registros.set(novaLista);
    this.persistir(novaLista);
    return atualizado;
  }

  limpar(): void {
    this._registros.set([]);
    try {
      this.storage.removeItem(CHAVE_JORNADA_OS);
    } catch {
      // Ignora erro de storage
    }
  }

  private carregarInicial(): RegistroJornadaOs[] {
    try {
      const raw = this.storage.getItem(CHAVE_JORNADA_OS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_REGISTROS) : [];
    } catch {
      return [];
    }
  }

  private persistir(lista: RegistroJornadaOs[]): void {
    try {
      this.storage.setItem(CHAVE_JORNADA_OS, JSON.stringify(lista));
    } catch {
      // Ignora erro de cota ou bloqueio de storage
    }
  }
}
