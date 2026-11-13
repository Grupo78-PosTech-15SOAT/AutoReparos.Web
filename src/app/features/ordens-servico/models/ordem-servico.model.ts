import { StatusOS } from '../../../shared/utils/status-os.utils';

export type { StatusOS };

export interface OsResumo {
  id: string;
  clienteId: string;
  veiculoId: string;
  status: StatusOS;
  atualizadaEm: string;
}

/** Resposta de `GET /ordens-servico?status=&pagina=&tamanho=`. */
export interface OsPagina {
  total: number;
  itens: OsResumo[];
}

export interface FiltroOs {
  status?: StatusOS;
  pagina?: number;
  tamanho?: number;
}

export interface HistoricoStatus {
  status: string;
  em: string;
}

/** Resposta de `GET /ordens-servico/{id}`. */
export interface OsDetalhe {
  id: string;
  clienteId: string;
  veiculoId: string;
  observacao?: string;
  status: StatusOS;
  historico: HistoricoStatus[];
}

/** Resposta pública de `GET /ordens-servico/{id}/consulta` (sem cliente nem veículo). */
export interface OsConsulta {
  id: string;
  status: StatusOS;
  historico: HistoricoStatus[];
}

export interface CriarOSRequest {
  clienteId: string;
  veiculoId: string;
  observacao?: string;
}

export interface CancelamentoResposta {
  status?: string;
  estado?: string;
}

export interface OrcamentoItemResumo {
  nome?: string;
  descricao?: string;
  tipo?: string;
  quantidade: number;
  precoUnitario: number;
}

/** Resposta de `GET /orcamentos?ordemServicoId=`. */
export interface OrcamentoResumo {
  id: string;
  valor: number;
  status: string;
  pagamentoId?: string;
  itens: OrcamentoItemResumo[];
}

/** Item da fila de execução vinculado à OS. */
export interface ExecucaoResumo {
  id: string;
  ordemServicoId?: string;
  status: string;
  mecanicoId?: string;
}
