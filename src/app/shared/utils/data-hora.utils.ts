export type ModoDataHora = 'relativo' | 'curto' | 'completo';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** Converte ISO (ou Date) em Date válida; `null` quando vazia ou inválida. */
export function paraData(valor: string | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** `dd/MM HH:mm`, ou `dd/MM/yyyy HH:mm` quando o ano difere de `agora` (ou sempre, em `completo`). */
function dataEHora(data: Date, agora: Date, comAno: boolean): string {
  const dia = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`;
  const ano = comAno || data.getFullYear() !== agora.getFullYear() ? `/${data.getFullYear()}` : '';
  return `${dia}${ano} ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/**
 * Formata data e hora em pt-BR.
 * - `relativo`: "agora" (< 1 min, ou até 1 min no futuro), "há N min" (< 1 h), "há N h" (< 24 h), depois `dd/MM HH:mm`.
 * - `curto`: `dd/MM HH:mm` (com ano quando for outro ano).
 * - `completo`: `dd/MM/yyyy HH:mm`.
 * Entrada vazia ou inválida devolve "—".
 */
export function formatarDataHora(
  valor: string | Date | null | undefined,
  modo: ModoDataHora = 'relativo',
  agora: Date = new Date()
): string {
  const data = paraData(valor);
  if (!data) return '—';

  if (modo === 'completo') return dataEHora(data, agora, true);
  if (modo === 'curto') return dataEHora(data, agora, false);

  const diff = agora.getTime() - data.getTime();
  // Relógio do servidor um pouco adiantado: menos de 1 minuto no futuro ainda é "agora".
  if (diff < 0 && diff > -MINUTO) return 'agora';
  if (diff >= 0 && diff < DIA) {
    if (diff < MINUTO) return 'agora';
    if (diff < HORA) return `há ${Math.floor(diff / MINUTO)} min`;
    return `há ${Math.floor(diff / HORA)} h`;
  }
  return dataEHora(data, agora, false);
}

/** Texto completo para tooltip: `dd/MM/yyyy HH:mm:ss`. */
export function dataHoraCompleta(valor: string | Date | null | undefined): string {
  const data = paraData(valor);
  if (!data) return '';
  return `${dataEHora(data, data, true)}:${doisDigitos(data.getSeconds())}`;
}
