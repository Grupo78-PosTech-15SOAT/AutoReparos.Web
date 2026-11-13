import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { jwtInterceptor } from './jwt.interceptor';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { API_ENDPOINTS } from '../config/api-endpoints';

function memoria(token: string | null): Storage {
  const dados = new Map<string, string>();
  if (token) dados.set('autoreparos_token', token);
  return {
    get length() { return dados.size; },
    clear: () => dados.clear(),
    getItem: (k: string) => dados.get(k) ?? null,
    key: () => null,
    removeItem: (k: string) => { dados.delete(k); },
    setItem: (k: string, v: string) => { dados.set(k, v); },
  };
}

describe('JwtInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  function configurar(token: string | null) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: memoria(token) },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => controller.verify());

  describe('com token', () => {
    beforeEach(() => configurar('abc'));

    it.each([
      ['lista de OS', API_ENDPOINTS.ORDENS_SERVICO.BASE],
      ['cancelamento', API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO('1')],
      ['orçamento', API_ENDPOINTS.ORCAMENTOS.BASE],
      ['pagamento', API_ENDPOINTS.PAGAMENTOS.BY_ID('1')],
      ['fila de execução', API_ENDPOINTS.EXECUCAO.FILA],
      ['sagas', API_ENDPOINTS.SAGAS.BASE],
      ['clientes', API_ENDPOINTS.CLIENTES.BASE],
    ])('envia o token em %s', (_nome, url) => {
      http.get(url).subscribe();
      const req = controller.expectOne(url);
      expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
      req.flush({});
    });

    it.each([
      ['login', API_ENDPOINTS.AUTH.LOGIN],
      ['consulta pública da OS', API_ENDPOINTS.ORDENS_SERVICO.CONSULTA('1')],
      ['orçamento público', `${API_ENDPOINTS.ORCAMENTOS.PUBLICO}?token=x`],
      ['aprovação pública', API_ENDPOINTS.ORCAMENTOS.PUBLICO_APROVACAO],
      ['rota fora da Surface', 'https://terceiro.example.com/api/v1/ordens-servico'],
      ['rota legada', '/api/ordem-servico'],
    ])('não envia o token em %s', (_nome, url) => {
      http.get(url).subscribe();
      const req = controller.expectOne(r => r.url === url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  it('sem token não envia o cabeçalho', () => {
    configurar(null);
    http.get(API_ENDPOINTS.ORDENS_SERVICO.BASE).subscribe();
    const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BASE);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('o login usa POST /api/auth/login', () => {
    configurar(null);
    http.post(API_ENDPOINTS.AUTH.LOGIN, { email: 'a@b.c', senha: 'x' }).subscribe();
    const req = controller.expectOne(API_ENDPOINTS.AUTH.LOGIN);
    expect(req.request.method).toBe('POST');
    expect(req.request.url).toMatch(/\/api\/auth\/login$/);
    req.flush({});
  });
});
