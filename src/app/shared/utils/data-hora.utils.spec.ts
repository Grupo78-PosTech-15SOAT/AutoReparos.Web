import { describe, it, expect } from 'vitest';
import { formatarDataHora } from './data-hora.utils';

const AGORA = new Date(2026, 10, 17, 14, 32, 0);
const antes = (ms: number) => new Date(AGORA.getTime() - ms);

describe('formatarDataHora', () => {
  it('relativo: menos de 1 minuto vira "agora"', () => {
    expect(formatarDataHora(antes(30_000), 'relativo', AGORA)).toBe('agora');
  });

  it('relativo: limites exatos de 1 minuto, 1 hora e 24 horas', () => {
    expect(formatarDataHora(antes(59_999), 'relativo', AGORA)).toBe('agora');
    expect(formatarDataHora(antes(60_000), 'relativo', AGORA)).toBe('há 1 min');
    expect(formatarDataHora(antes(3_599_999), 'relativo', AGORA)).toBe('há 59 min');
    expect(formatarDataHora(antes(3_600_000), 'relativo', AGORA)).toBe('há 1 h');
    expect(formatarDataHora(antes(86_399_999), 'relativo', AGORA)).toBe('há 23 h');
    expect(formatarDataHora(antes(86_400_000), 'relativo', AGORA)).toBe('16/11 14:32');
  });

  it('relativo: até 1 minuto no futuro (relógio adiantado) vira "agora"; além disso, a data', () => {
    expect(formatarDataHora(antes(-10_000), 'relativo', AGORA)).toBe('agora');
    expect(formatarDataHora(antes(-60_000), 'relativo', AGORA)).toBe('17/11 14:33');
  });

  it('relativo: menos de 1 hora vira "há N min"', () => {
    expect(formatarDataHora(antes(5 * 60_000), 'relativo', AGORA)).toBe('há 5 min');
    expect(formatarDataHora(antes(59 * 60_000), 'relativo', AGORA)).toBe('há 59 min');
  });

  it('relativo: menos de 24 horas vira "há N h"', () => {
    expect(formatarDataHora(antes(3 * 3_600_000), 'relativo', AGORA)).toBe('há 3 h');
    expect(formatarDataHora(antes(23 * 3_600_000 + 59 * 60_000), 'relativo', AGORA)).toBe('há 23 h');
  });

  it('relativo: a partir de 24 horas no mesmo ano vira dd/MM HH:mm', () => {
    expect(formatarDataHora(new Date(2026, 10, 15, 14, 32), 'relativo', AGORA)).toBe('15/11 14:32');
    expect(formatarDataHora(antes(24 * 3_600_000), 'relativo', AGORA)).toBe('16/11 14:32');
  });

  it('relativo: outro ano inclui o ano', () => {
    expect(formatarDataHora(new Date(2025, 10, 16, 14, 32), 'relativo', AGORA)).toBe('16/11/2025 14:32');
  });

  it('aceita string ISO', () => {
    const iso = new Date(2026, 0, 5, 9, 7).toISOString();
    expect(formatarDataHora(iso, 'curto', AGORA)).toBe('05/01 09:07');
    expect(formatarDataHora(iso, 'completo', AGORA)).toBe('05/01/2026 09:07');
  });

  it('vazio ou inválido vira "—"', () => {
    expect(formatarDataHora('', 'relativo', AGORA)).toBe('—');
    expect(formatarDataHora(null, 'relativo', AGORA)).toBe('—');
    expect(formatarDataHora(undefined, 'curto', AGORA)).toBe('—');
    expect(formatarDataHora('não é data', 'relativo', AGORA)).toBe('—');
  });
});
