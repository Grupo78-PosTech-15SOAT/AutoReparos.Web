import { Pipe, PipeTransform } from '@angular/core';

const FORMATO_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um valor em reais (`R$ 1.234,50`). Valor não numérico vira "—". */
export function formatarMoeda(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = typeof valor === 'number' ? valor : Number(valor);
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
