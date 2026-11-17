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

/** Estados da Saga e da Execução que não são status da OS (não viram colunas do Kanban). */
export const STATUS_EXTRA_MAP: Record<string, StatusOsInfo> = {
  ReservandoInsumos: { label: 'Reservando insumos', cssClass: 'status-aguardando' },
  AguardandoInsumos: { label: 'Aguardando insumos', cssClass: 'status-diagnostico' },
  ExecucaoLiberada: { label: 'Execução liberada', cssClass: 'status-execucao' },
  ExecucaoConcluida: { label: 'Execução concluída', cssClass: 'status-finalizada' },
  PagamentoCapturado: { label: 'Pagamento capturado', cssClass: 'status-finalizada' },
  Compensando: { label: 'Compensando', cssClass: 'status-diagnostico' },
  Compensada: { label: 'Compensada', cssClass: 'status-entregue' },
  CompensacaoFalhou: { label: 'Compensação falhou', cssClass: 'status-falha' },
  Fila: { label: 'Na fila', cssClass: 'status-recebida' },
  Falhou: { label: 'Falhou', cssClass: 'status-falha' },
};

/** Classe usada quando o status não é conhecido. */
export const CLASSE_STATUS_DESCONHECIDO = 'status-desconhecido';

export function getStatusOsInfo(status: string): StatusOsInfo {
  return (
    (STATUS_OS_MAP as Record<string, StatusOsInfo>)[status] ??
    STATUS_EXTRA_MAP[status] ?? { label: status || 'Desconhecido', cssClass: CLASSE_STATUS_DESCONHECIDO }
  );
}

/** Opções de filtro com rótulo pt-BR; a primeira é "Todos os estados" (valor vazio). */
export function opcoesDeEstados(estados: readonly string[], rotuloTodos = 'Todos os estados'): { value: string; label: string }[] {
  return [{ value: '', label: rotuloTodos }, ...estados.map(e => ({ value: e, label: getStatusOsInfo(e).label }))];
}
