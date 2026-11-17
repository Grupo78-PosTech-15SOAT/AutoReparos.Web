/** Status HTTP que o Web traduz para mensagens do catálogo. */
export const STATUS_TRATADOS = [400, 401, 403, 404, 409, 422, 503] as const;

/** Mensagens por `{codigo}` devolvido pelos serviços (independe do status). */
export const MENSAGENS_POR_CODIGO: Record<string, string> = {
  saga_em_andamento: 'A saga desta OS ainda está em andamento. Tente novamente em instantes.',
  orcamento_nao_pendente: 'Este orçamento não está mais pendente de aprovação.',
  token_invalido: 'Link inválido ou expirado.',
  filtro_invalido: 'Filtro inválido. Revise os parâmetros da consulta.',
  execucao_estado_invalido: 'A execução não está em um estado que permita esta operação.',
  execucao_nao_encontrada: 'Execução não encontrada.',
  cancelamento_indisponivel: 'O cancelamento não está mais disponível para esta OS.',
  ordem_servico_conflito: 'A ordem de serviço está em conflito com o estado da operação.',
  retentativa_indisponivel: 'A retentativa não está disponível para esta saga.',
  dependencia_indisponivel: 'Um serviço de que esta operação depende está indisponível. Tente novamente em instantes.',
  orcamento_invalido: 'Orçamento inválido. Revise os itens e valores informados (orcamento_invalido).',
  item_catalogo_inexistente: 'Item do catálogo informado não existe (item_catalogo_inexistente).',
  transicao_invalida: 'Transição de estado inválida para a ordem de serviço (transicao_invalida).',
  checkout_indisponivel: 'O checkout só fica disponível após a conclusão dos serviços na oficina (checkout_indisponivel).',
  reembolso_invalido: 'Dados de reembolso inválidos (reembolso_invalido).',
  reembolso_recusado_provedor: 'O reembolso foi recusado pela operadora de pagamento (reembolso_recusado_provedor).',
  reembolso_indisponivel: 'Reembolso indisponível para esta transação (reembolso_indisponivel).',
  conflito_concorrencia: 'Conflito de concorrência detectado. Tente novamente (conflito_concorrencia).',
  etapa_invalida: 'Etapa de execução inválida ou já realizada (etapa_invalida).',
  conclusao_invalida: 'A execução não pode ser concluída no estado atual (conclusao_invalida).',
  falha_invalida: 'Não foi possível registrar falha no estado atual (falha_invalida).',
  reexecucao_invalida: 'Reexecução permitida apenas para execuções que falharam (reexecucao_invalida).',
  servico_invalido: 'Dados do serviço inválidos. Verifique nome e preço unitário (servico_invalido).',
  insumo_invalido: 'Dados do insumo inválidos. Verifique nome, preço e quantidade (insumo_invalido).',
  entrada_invalida: 'Quantidade de entrada de estoque inválida (entrada_invalida).',
  insumo_nao_encontrado: 'Insumo não encontrado no estoque (insumo_nao_encontrado).',
  ordem_servico_invalida: 'Dados da ordem de serviço inválidos (ordem_servico_invalida).',
  cliente_nao_encontrado: 'Cliente não encontrado no cadastro (cliente_nao_encontrado).',
  veiculo_nao_encontrado: 'Veículo não encontrado no cadastro (veiculo_nao_encontrado).',
  veiculo_de_outro_cliente: 'O veículo selecionado não pertence ao cliente informado (veiculo_de_outro_cliente).',
  cadastros_indisponivel: 'Serviço de cadastros indisponível no momento (cadastros_indisponivel).',
};

/** Título e mensagem genérica por status, usados quando o código é desconhecido ou ausente. */
export const MENSAGENS_POR_STATUS: Record<number, { titulo: string; mensagem: string }> = {
  400: { titulo: 'Requisição Inválida', mensagem: 'Dados inválidos na requisição.' },
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

/** Extrai o código de erro `{ codigo }`. */
export function extrairCodigoErro(body: any): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  if (typeof body.codigo === 'string') return body.codigo;
  return undefined;
}

/** Extrai a mensagem de detalhe do erro (`detalhe`, `erro` da AuthLambda, `mensagem` ou `message`). */
export function extrairDetalheErro(body: any): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  if (typeof body.detalhe === 'string') return body.detalhe;
  if (typeof body.erro === 'string') return body.erro;
  if (typeof body.mensagem === 'string') return body.mensagem;
  if (typeof body.message === 'string') return body.message;
  return undefined;
}

/**
 * Resolve a mensagem de um erro HTTP: o catálogo por código vence; sem código conhecido
 * vale o detalhe informado no corpo ou a mensagem genérica do status.
 */
export function resolverMensagemErro(status: number, codigo?: unknown, detalhe?: unknown): MensagemErro | null {
  const generica = MENSAGENS_POR_STATUS[status];
  if (!generica) {
    return null;
  }
  const codStr = typeof codigo === 'string' ? codigo : undefined;
  const detStr = typeof detalhe === 'string' ? detalhe : undefined;
  const mensagemCatalogo = codStr ? MENSAGENS_POR_CODIGO[codStr] : undefined;

  return {
    titulo: generica.titulo,
    mensagem: mensagemCatalogo ?? detStr ?? generica.mensagem,
  };
}

/** Mensagem do catálogo para um erro de componente, ou `fallback` quando não houver. */
export function mensagemDoCodigo(codigo: unknown, fallback: string): string {
  return (typeof codigo === 'string' && MENSAGENS_POR_CODIGO[codigo]) || fallback;
}
