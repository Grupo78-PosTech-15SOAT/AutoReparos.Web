export interface Servico {
  id?: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  precoUnitario?: number;
  precoBase?: number;
  valorTabelado?: number;
}

export function normalizarServico(raw: any): Servico {
  const preco = Number(raw?.precoUnitario ?? raw?.precoBase ?? raw?.valorTabelado ?? 0);
  return {
    ...raw,
    nome: raw?.nome ?? '',
    precoUnitario: preco,
    precoBase: preco,
    valorTabelado: preco,
  };
}
