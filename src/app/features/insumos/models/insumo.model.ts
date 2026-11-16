export interface Insumo {
  id?: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  precoUnitario?: number;
  valor?: number;
  saldoDisponivel?: number;
  quantidadeEstoque?: number;
  saldoReservado?: number;
}

export interface RegistrarEntradaInsumoRequest {
  quantidade: number;
  motivo: string;
}

export function normalizarInsumo(raw: Partial<Insumo>): Insumo {
  const preco = Number(raw.precoUnitario ?? raw.valor ?? 0);
  const saldoDisponivel = Number(raw.saldoDisponivel ?? raw.quantidadeEstoque ?? 0);
  const saldoReservado = Number(raw.saldoReservado ?? 0);
  return {
    ...raw,
    nome: raw.nome ?? '',
    precoUnitario: preco,
    valor: preco,
    saldoDisponivel,
    quantidadeEstoque: saldoDisponivel,
    saldoReservado,
  };
}
