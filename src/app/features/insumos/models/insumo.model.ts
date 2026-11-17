export interface Insumo {
  id?: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  precoUnitario?: number;
  valor?: number;
  quantidadeDisponivel?: number;
  quantidadeReservada?: number;
  quantidadeInicial?: number;
  saldoDisponivel?: number;
  quantidadeEstoque?: number;
  saldoReservado?: number;
}

export interface RegistrarEntradaInsumoRequest {
  quantidade: number;
}

export function normalizarInsumo(raw: any): Insumo {
  const preco = Number(raw?.precoUnitario ?? raw?.valor ?? 0);
  const qtdDisp = Number(raw?.quantidadeDisponivel ?? raw?.saldoDisponivel ?? raw?.quantidadeEstoque ?? 0);
  const qtdRes = Number(raw?.quantidadeReservada ?? raw?.saldoReservado ?? 0);
  return {
    ...raw,
    nome: raw?.nome ?? '',
    precoUnitario: preco,
    valor: preco,
    quantidadeDisponivel: qtdDisp,
    quantidadeReservada: qtdRes,
    saldoDisponivel: qtdDisp,
    quantidadeEstoque: qtdDisp,
    saldoReservado: qtdRes,
  };
}
