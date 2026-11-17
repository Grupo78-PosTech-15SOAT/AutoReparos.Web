import { describe, it, expect } from 'vitest';
import {
  MENSAGENS_POR_CODIGO,
  MENSAGENS_POR_STATUS,
  extrairCodigoErro,
  extrairDetalheErro,
  resolverMensagemErro,
  mensagemDoCodigo
} from '../http/error-catalog';

describe('ErrorCatalog', () => {
  it('contém todos os códigos de domínio dos microsserviços e da AuthLambda', () => {
    const codigosObrigatorios = [
      'orcamento_invalido',
      'item_catalogo_inexistente',
      'transicao_invalida',
      'checkout_indisponivel',
      'reembolso_invalido',
      'reembolso_recusado_provedor',
      'reembolso_indisponivel',
      'conflito_concorrencia',
      'etapa_invalida',
      'conclusao_invalida',
      'falha_invalida',
      'reexecucao_invalida',
      'servico_invalido',
      'insumo_invalido',
      'entrada_invalida',
      'insumo_nao_encontrado',
      'ordem_servico_invalida',
      'cliente_nao_encontrado',
      'veiculo_nao_encontrado',
      'veiculo_de_outro_cliente',
      'cadastros_indisponivel',
      'execucao_nao_encontrada',
      'execucao_estado_invalido',
      'filtro_invalido',
      'cancelamento_indisponivel',
      'ordem_servico_conflito',
      'saga_em_andamento',
      'retentativa_indisponivel',
      'dependencia_indisponivel',
    ];

    for (const cod of codigosObrigatorios) {
      expect(MENSAGENS_POR_CODIGO[cod], `Código ausente: ${cod}`).toBeDefined();
    }
  });

  it('extrai codigo de { codigo } mas não trata erro como codigo', () => {
    expect(extrairCodigoErro({ codigo: 'transicao_invalida' })).toBe('transicao_invalida');
    expect(extrairCodigoErro({ erro: 'CPF inválido.' })).toBeUndefined();
  });

  it('extrai erro da AuthLambda como detalhe em extrairDetalheErro', () => {
    expect(extrairDetalheErro({ erro: 'CPF inválido.' })).toBe('CPF inválido.');
    expect(extrairDetalheErro({ detalhe: 'Detalhe do erro.' })).toBe('Detalhe do erro.');
    expect(extrairDetalheErro({ mensagem: 'Mensagem.' })).toBe('Mensagem.');
  });
});
