import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiUrl;

const V1 = `${API_BASE_URL}/api/v1`;

/** Endpoints da Surface do plano web-adaptacao: sempre `API_BASE_URL` + `/api/v1/...` (exceto `/api/auth/login` e `/auth/cliente`). */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    CLIENTE: `${API_BASE_URL}/auth/cliente`,
  },

  ORDENS_SERVICO: {
    BASE: `${V1}/ordens-servico`,
    BY_ID: (id: string) => `${V1}/ordens-servico/${id}`,
    CANCELAMENTO: (id: string) => `${V1}/ordens-servico/${id}/cancelamento`,
  },

  ORCAMENTOS: {
    BASE: `${V1}/orcamentos`,
    APROVACAO: (id: string) => `${V1}/orcamentos/${id}/aprovacao`,
  },

  PAGAMENTOS: {
    CHECKOUT: (id: string) => `${V1}/pagamentos/${id}/checkout`,
    REEMBOLSOS: (id: string) => `${V1}/pagamentos/${id}/reembolsos`,
  },

  EXECUCAO: {
    FILA: `${V1}/fila-execucao`,
    ETAPAS: (execucaoId: string) => `${V1}/execucoes/${execucaoId}/etapas`,
    CONCLUSAO: (execucaoId: string) => `${V1}/execucoes/${execucaoId}/conclusao`,
    FALHA: (execucaoId: string) => `${V1}/execucoes/${execucaoId}/falha`,
    REEXECUCAO: (execucaoId: string) => `${V1}/execucoes/${execucaoId}/reexecucao`,
  },

  SERVICOS: {
    BASE: `${V1}/servicos`,
  },

  INSUMOS: {
    BASE: `${V1}/insumos`,
    ENTRADAS: (id: string) => `${V1}/insumos/${id}/entradas`,
  },

  SAGAS: {
    BASE: `${V1}/admin/sagas`,
    BY_ID: (ordemServicoId: string) => `${V1}/admin/sagas/${ordemServicoId}`,
    RETENTAR: (ordemServicoId: string) => `${V1}/admin/sagas/${ordemServicoId}/retentar`,
  },

  CLIENTES: {
    BASE: `${V1}/clientes`,
    BY_ID: (id: string) => `${V1}/clientes/${id}`,
  },

  VEICULOS: {
    BASE: `${V1}/veiculos`,
    BY_ID: (id: string) => `${V1}/veiculos/${id}`,
  },

  USUARIOS: {
    BASE: `${V1}/usuarios`,
    BY_ID: (id: string) => `${V1}/usuarios/${id}`,
  },
};
