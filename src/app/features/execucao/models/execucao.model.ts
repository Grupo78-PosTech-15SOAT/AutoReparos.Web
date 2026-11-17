export type TipoEtapaExecucao = 'Diagnostico' | 'Reparo';

export const ESTADOS_EXECUCAO = ['Fila', 'EmExecucao', 'Concluida', 'Falhou', 'Cancelada'] as const;

export interface EtapaExecutada {
  id?: string;
  sequencia: number;
  tipo: string;
  descricao: string;
  responsavel?: string | null;
  registradaEm?: string;
}

export interface EtapaCriada {
  id: string;
  execucaoId: string;
  sequencia: number;
  tipo: string;
  descricao: string;
  responsavel?: string | null;
  registradaEm?: string;
}

export interface ItemFilaExecucao {
  id: string;
  ordemServicoId: string;
  clienteId?: string;
  veiculoId?: string;
  correlacaoId?: string;
  status: string;
  intervencaoRequerida?: boolean;
  motivoFalha?: string | null;
  criadaEm?: string;
  atualizadaEm?: string;
  concluidaEm?: string | null;
  falhouEm?: string | null;
  canceladaEm?: string | null;
  motivoCancelamento?: string | null;
  etapas?: EtapaExecutada[];
}

export interface FiltroFilaExecucao {
  status?: string;
  mecanico?: string;
}

export interface RegistrarEtapaRequest {
  tipo: TipoEtapaExecucao;
  descricao: string;
}
