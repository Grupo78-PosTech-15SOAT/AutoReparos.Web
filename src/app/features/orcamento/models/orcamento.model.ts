export type TipoItemOrcamento = 'Servico' | 'Insumo';

export interface ItemOrcamento {
  tipo: TipoItemOrcamento;
  referenciaId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface CriarOrcamentoRequest {
  ordemServicoId: string;
  clienteId: string;
  valor: number;
  itens?: ItemOrcamento[];
}

export interface OrcamentoCriadoResponse {
  id: string;
  ordemServicoId?: string;
  clienteId?: string;
  valor: number;
  status: string;
  itens?: ItemOrcamento[];
}

export function agruparItensOrcamento(itens: ItemOrcamento[]): ItemOrcamento[] {
  const mapa = new Map<string, ItemOrcamento>();
  for (const it of itens) {
    const chave = `${it.tipo}_${it.referenciaId}`;
    const existente = mapa.get(chave);
    if (existente) {
      const novaQtd = existente.quantidade + it.quantidade;
      mapa.set(chave, {
        ...existente,
        quantidade: novaQtd,
        subtotal: Number((novaQtd * existente.precoUnitario).toFixed(2))
      });
    } else {
      mapa.set(chave, {
        ...it,
        quantidade: it.quantidade,
        subtotal: Number((it.quantidade * it.precoUnitario).toFixed(2))
      });
    }
  }
  return Array.from(mapa.values());
}
