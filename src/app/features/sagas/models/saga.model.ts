export const ESTADOS_SAGA = [
  'OrcamentoAprovado',
  'ReservandoInsumos',
  'AguardandoInsumos',
  'ExecucaoLiberada',
  'ExecucaoConcluida',
  'IntervencaoRequerida',
  'PagamentoCapturado',
  'Compensando',
  'Compensada',
  'CompensacaoFalhou',
] as const;

export type EstadoSaga = (typeof ESTADOS_SAGA)[number] | string;

export interface SagaResumo {
  ordemServicoId: string;
  estado: EstadoSaga;
  atualizadoEm: string;
  orcamentoId?: string;
}

export interface EtapaSaga {
  numero: number;
  nome: string;
  situacao: string;
  resultadoCompensacao?: string | null;
  erroCompensacao?: string | null;
}

export interface ComandoSaga {
  tipo: string;
  destino: string;
  enviadoEm?: string | null;
  tentativas: number;
  ultimoErro?: string | null;
}

export interface RegistroSaga {
  em: string;
  evento: string;
  eventId?: string | null;
  descricao: string;
}

export interface ItemReservaSaga {
  insumoId: string;
  quantidade: number;
}

export interface SagaDetalhe extends SagaResumo {
  correlacaoId?: string;
  motivoCompensacao?: string | null;
  itens?: ItemReservaSaga[];
  etapas: EtapaSaga[];
  comandos: ComandoSaga[];
  registros: RegistroSaga[];
}

export interface FiltroSagas {
  estado?: string;
  paradaHaMinutos?: number | null;
}

export interface RetentativaResposta {
  ordemServicoId: string;
  passo?: string;
  estado?: string;
}
