import { Pipe, PipeTransform } from '@angular/core';

const FORMATO_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um valor em reais (`R$ 1.234,50`). Valor não numérico vira "—". */
export function formatarMoeda(valor: unknown): string {
  let numero: number;
  if (typeof valor === 'number') {
    numero = valor;
  } else if (typeof valor === 'string' && valor.trim() !== '') {
    numero = Number(valor);
  } else {
    return '—';
  }
  if (!Number.isFinite(numero)) return '—';
  // Intl usa espaço não separável entre "R$" e o número; normaliza para espaço comum.
  return FORMATO_BRL.format(numero).replace(/ /g, ' ');
}

@Pipe({ name: 'moeda', standalone: true })
export class MoedaPipe implements PipeTransform {
  transform(valor: unknown): string {
    return formatarMoeda(valor);
  }
}
