/** Status HTTP que o Web traduz para mensagens do catálogo. */
export const STATUS_TRATADOS = [401, 403, 404, 409, 422, 503] as const;

/** Mensagens por `{codigo}` devolvido pelos serviços (independe do status). */
export const MENSAGENS_POR_CODIGO: Record<string, string> = {
  saga_em_andamento: 'A saga desta OS ainda está em andamento. Tente novamente em instantes.',
  orcamento_nao_pendente: 'Este orçamento não está mais pendente de aprovação.',
  token_invalido: 'Link inválido ou expirado.',
  filtro_invalido: 'Filtro inválido. Revise os parâmetros da consulta.',
  execucao_estado_invalido: 'A execução não está em um estado que permita esta operação.',
  cancelamento_indisponivel: 'O cancelamento não está mais disponível para esta OS.',
  retentativa_indisponivel: 'A retentativa não está disponível para esta saga.',
  dependencia_indisponivel: 'Um serviço de que esta operação depende está indisponível. Tente novamente em instantes.',
};

/** Título e mensagem genérica por status, usados quando o código é desconhecido ou ausente. */
export const MENSAGENS_POR_STATUS: Record<number, { titulo: string; mensagem: string }> = {
  401: { titulo: 'Sessão Expirada', mensagem: 'Por favor, faça login novamente.' },
  403: { titulo: 'Acesso Negado', mensagem: 'Seu perfil de usuário não possui permissão para esta ação.' },
  404: { titulo: 'Não Encontrado', mensagem: 'O recurso solicitado não foi encontrado.' },
  409: { titulo: 'Conflito', mensagem: 'A operação conflita com o estado atual do recurso.' },
  422: { titulo: 'Dados Inválidos', mensagem: 'Os dados enviados são inválidos. Verifique e tente novamente.' },
  503: { titulo: 'Serviço Indisponível', mensagem: 'O serviço está temporariamente indisponível. Tente novamente em instantes.' },
};

export interface MensagemErro {
  titulo: string;
  mensagem: string;
}

/**
 * Resolve a mensagem de um erro HTTP: o catálogo por código vence; sem código conhecido
 * vale a mensagem genérica do status. Devolve `null` para status fora do catálogo.
 */
export function resolverMensagemErro(status: number, codigo?: unknown): MensagemErro | null {
  const generica = MENSAGENS_POR_STATUS[status];
  if (!generica) {
    return null;
  }
  const mensagem = typeof codigo === 'string' ? MENSAGENS_POR_CODIGO[codigo] : undefined;
  return { titulo: generica.titulo, mensagem: mensagem ?? generica.mensagem };
}

/** Mensagem do catálogo para um erro de componente, ou `fallback` quando não houver. */
export function mensagemDoCodigo(codigo: unknown, fallback: string): string {
  return (typeof codigo === 'string' && MENSAGENS_POR_CODIGO[codigo]) || fallback;
}
