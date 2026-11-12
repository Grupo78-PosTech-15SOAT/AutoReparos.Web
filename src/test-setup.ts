/**
 * Node 25+ expõe um `localStorage` nativo sem `getItem`, que sobrepõe o do jsdom.
 * Garante um Storage funcional em memória apenas quando o global está quebrado.
 */
function criarStorageEmMemoria(): Storage {
  const dados = new Map<string, string>();
  return {
    get length() { return dados.size; },
    clear: () => dados.clear(),
    getItem: (chave: string) => dados.get(chave) ?? null,
    key: (indice: number) => Array.from(dados.keys())[indice] ?? null,
    removeItem: (chave: string) => { dados.delete(chave); },
    setItem: (chave: string, valor: string) => { dados.set(chave, String(valor)); },
  };
}

for (const nome of ['localStorage', 'sessionStorage'] as const) {
  let valido = false;
  try {
    valido = typeof globalThis[nome]?.getItem === 'function';
  } catch {
    valido = false;
  }
  if (!valido) {
    Object.defineProperty(globalThis, nome, { value: criarStorageEmMemoria(), configurable: true, writable: true });
  }
}
