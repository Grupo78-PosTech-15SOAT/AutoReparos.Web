export interface Servico {
  id?: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  precoBase?: number;
  valorTabelado?: number;
}

export function normalizarServico(raw: Partial<Servico>): Servico {
  const preco = Number(raw.precoBase ?? raw.valorTabelado ?? 0);
  return {
    ...raw,
    nome: raw.nome ?? '',
    precoBase: preco,
    valorTabelado: preco,
  };
}
