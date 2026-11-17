import { describe, it, expect } from 'vitest';
import { MoedaPipe } from './moeda.pipe';

describe('MoedaPipe', () => {
  const pipe = new MoedaPipe();

  it('formata em reais no padrão pt-BR', () => {
    expect(pipe.transform(1234.5)).toBe('R$ 1.234,50');
    expect(pipe.transform(0)).toBe('R$ 0,00');
    expect(pipe.transform(1000000)).toBe('R$ 1.000.000,00');
  });

  it('aceita string numérica', () => {
    expect(pipe.transform('99.9')).toBe('R$ 99,90');
  });

  it('valor não numérico vira "—"', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('abc')).toBe('—');
    expect(pipe.transform('   ')).toBe('—');
    expect(pipe.transform(true)).toBe('—');
    expect(pipe.transform({})).toBe('—');
    expect(pipe.transform(Number.NaN)).toBe('—');
  });
});
