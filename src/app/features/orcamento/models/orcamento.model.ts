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
  itens: ItemOrcamento[];
}

export interface OrcamentoCriadoResponse {
  id: string;
  ordemServicoId?: string;
  clienteId?: string;
  valor: number;
  status: string;
  itens?: ItemOrcamento[];
}
