export type TipoEtapaExecucao = 'Diagnostico' | 'Reparo';

export interface ItemFilaExecucao {
  id: string;
  ordemServicoId: string;
  status: string;
  mecanicoId?: string | null;
  etapaAtual?: string | null;
  motivoFalha?: string | null;
}

export interface FiltroFilaExecucao {
  status?: string;
  mecanicoId?: string;
}

export interface RegistrarEtapaRequest {
  etapa: TipoEtapaExecucao;
  tipo?: TipoEtapaExecucao;
  descricao?: string;
}
