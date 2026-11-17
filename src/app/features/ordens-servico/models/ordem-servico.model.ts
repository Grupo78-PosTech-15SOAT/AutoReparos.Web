import { StatusOS } from '../../../shared/utils/status-os.utils';

export type { StatusOS };

export interface OsResumo {
  id: string;
  clienteId?: string;
  veiculoId?: string;
  observacao?: string;
  status: StatusOS;
  atualizadaEm?: string;
}

export interface HistoricoStatus {
  id?: string;
  ordemServicoId?: string;
  status: string;
  em?: string;
  registradoEm?: string;
}

/** Resposta de `GET /api/v1/ordens-servico/{id}`. */
export interface OsDetalhe {
  id: string;
  clienteId: string;
  veiculoId: string;
  observacao?: string;
  status: StatusOS;
  historico: HistoricoStatus[];
}

export interface CriarOSRequest {
  clienteId: string;
  veiculoId: string;
  observacao?: string;
}

export interface CancelamentoResposta {
  ordemServicoId?: string;
  correlacaoId?: string;
  status?: string;
  estado?: string;
}

export interface RespostaFilaExecucao {
  itens: ExecucaoResumo[];
  restrito?: boolean;
}

/** Item da fila de execução vinculado à OS (`GET /api/v1/fila-execucao`). */
export interface ExecucaoResumo {
  id: string;
  ordemServicoId?: string;
  clienteId?: string;
  veiculoId?: string;
  status: string;
  intervencaoRequerida?: boolean;
  mecanicoId?: string;
  atualizadaEm?: string;
}

/** Resumo de Saga retornado por `GET /api/v1/admin/sagas`. */
export interface SagaAdminResumo {
  ordemServicoId: string;
  estado: string;
  atualizadoEm?: string;
  orcamentoId?: string;
}

export interface KanbanCard {
  id: string;
  status: StatusOS;
  clienteId?: string;
  veiculoId?: string;
  observacao?: string;
  atualizadaEm?: string;
  origem?: 'os' | 'execucao' | 'saga';
}

export interface KanbanColumn {
  status: StatusOS;
  label: string;
  cards: KanbanCard[];
}
