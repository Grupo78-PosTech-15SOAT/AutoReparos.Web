import { describe, it, expect } from 'vitest';
import { CLASSE_STATUS_DESCONHECIDO, STATUS_OS, getStatusOsInfo, opcoesDeEstados } from './status-os.utils';
import { ESTADOS_SAGA } from '../../features/sagas/models/saga.model';
import { ESTADOS_EXECUCAO } from '../../features/execucao/models/execucao.model';

describe('status estados extras', () => {
  const rotulosEsperados: Record<string, string> = {
    OrcamentoAprovado: 'Orçamento Aprovado',
    ReservandoInsumos: 'Reservando insumos',
    AguardandoInsumos: 'Aguardando insumos',
    ExecucaoLiberada: 'Execução liberada',
    ExecucaoConcluida: 'Execução concluída',
    IntervencaoRequerida: 'Intervenção Requerida',
    PagamentoCapturado: 'Pagamento capturado',
    Compensando: 'Compensando',
    Compensada: 'Compensada',
    CompensacaoFalhou: 'Compensação falhou',
    Fila: 'Na fila',
    EmExecucao: 'Em Execução',
    Concluida: 'Concluída',
    Falhou: 'Falhou',
    Cancelada: 'Cancelada',
  };

  it('cobre os 10 estados de Saga e os 5 de Execução', () => {
    expect(ESTADOS_SAGA).toHaveLength(10);
    expect(ESTADOS_EXECUCAO).toHaveLength(5);
    const todos = [...ESTADOS_SAGA, ...ESTADOS_EXECUCAO];
    expect(new Set(todos).size).toBe(15);
    for (const estado of todos) {
      expect(rotulosEsperados[estado], estado).toBeDefined();
    }
  });

  it.each(Object.entries(rotulosEsperados))('%s tem rótulo pt-BR e classe conhecida', (estado, rotulo) => {
    const info = getStatusOsInfo(estado);
    expect(info.label).toBe(rotulo);
    expect(info.cssClass).not.toBe(CLASSE_STATUS_DESCONHECIDO);
  });

  it('falhas usam a classe de falha', () => {
    expect(getStatusOsInfo('Falhou').cssClass).toBe('status-falha');
    expect(getStatusOsInfo('CompensacaoFalhou').cssClass).toBe('status-falha');
  });

  it('estado desconhecido cai no fallback', () => {
    expect(getStatusOsInfo('Xyz')).toEqual({ label: 'Xyz', cssClass: CLASSE_STATUS_DESCONHECIDO });
    expect(getStatusOsInfo('').label).toBe('Desconhecido');
  });

  it('STATUS_OS continua com os 7 status do Kanban', () => {
    expect(STATUS_OS).toEqual(['Recebida', 'OrcamentoAprovado', 'EmExecucao', 'Concluida', 'Paga', 'IntervencaoRequerida', 'Cancelada']);
  });

  it('opcoesDeEstados começa com "Todos os estados" e usa rótulos pt-BR', () => {
    expect(opcoesDeEstados(['Fila', 'Falhou'])).toEqual([
      { value: '', label: 'Todos os estados' },
      { value: 'Fila', label: 'Na fila' },
      { value: 'Falhou', label: 'Falhou' },
    ]);
  });
});
