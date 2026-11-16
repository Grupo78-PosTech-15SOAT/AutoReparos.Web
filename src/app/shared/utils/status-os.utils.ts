export interface StatusOsInfo {
  label: string;
  cssClass: string;
}

/** Única tabela de status da OS no Web: espelha os status reais da Saga do serviço OS. */
export const STATUS_OS_MAP = {
  Recebida: { label: 'Recebida', cssClass: 'status-recebida' },
  OrcamentoAprovado: { label: 'Orçamento Aprovado', cssClass: 'status-aguardando' },
  EmExecucao: { label: 'Em Execução', cssClass: 'status-execucao' },
  Concluida: { label: 'Concluída', cssClass: 'status-finalizada' },
  Paga: { label: 'Paga', cssClass: 'status-entregue' },
  IntervencaoRequerida: { label: 'Intervenção Requerida', cssClass: 'status-diagnostico' },
  Cancelada: { label: 'Cancelada', cssClass: 'status-entregue' },
} as const satisfies Record<string, StatusOsInfo>;

export type StatusOS = keyof typeof STATUS_OS_MAP;

/** Os 7 status reais da OS, na ordem das colunas do Kanban. */
export const STATUS_OS = Object.keys(STATUS_OS_MAP) as StatusOS[];

export function getStatusOsInfo(status: string): StatusOsInfo {
  return (STATUS_OS_MAP as Record<string, StatusOsInfo>)[status] ?? { label: status || 'Desconhecido', cssClass: 'status-entregue' };
}
