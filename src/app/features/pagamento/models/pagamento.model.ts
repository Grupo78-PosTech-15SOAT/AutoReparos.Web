export interface CheckoutResponse {
  pagamentoId?: string;
  urlCheckout?: string;
  initPoint?: string;
  preferenceId?: string;
  status?: string;
}

export interface SolicitarReembolsoRequest {
  valor: number;
  motivo: string;
  referencia: string;
}

export interface ReembolsoResponse {
  id?: string;
  pagamentoId?: string;
  valor?: number;
  motivo?: string;
  referencia?: string;
  status?: string;
}
