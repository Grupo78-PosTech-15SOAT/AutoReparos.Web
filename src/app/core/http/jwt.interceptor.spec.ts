import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { jwtInterceptor } from './jwt.interceptor';
import { errorInterceptor } from './error.interceptor';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { API_ENDPOINTS } from '../config/api-endpoints';

function memoria(token: string | null): Storage {
  const dados = new Map<string, string>();
  if (token) {
    dados.set('autoreparos_token', token);
    dados.set('autoreparos_user', '{"email":"a@b.c"}');
  }
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
  let storage: Storage;

  function configurar(token: string | null) {
    storage = memoria(token);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => controller.verify());

  describe('com token', () => {
    beforeEach(() => configurar('abc'));

    it.each([
      ['abertura de OS', API_ENDPOINTS.ORDENS_SERVICO.BASE],
      ['detalhe de OS', API_ENDPOINTS.ORDENS_SERVICO.BY_ID('1')],
      ['cancelamento', API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO('1')],
      ['orçamento', API_ENDPOINTS.ORCAMENTOS.BASE],
      ['aprovação de orçamento', API_ENDPOINTS.ORCAMENTOS.APROVACAO('1')],
      ['checkout de pagamento', API_ENDPOINTS.PAGAMENTOS.CHECKOUT('1')],
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
      ['login do operador', API_ENDPOINTS.AUTH.LOGIN],
      ['login do cliente', API_ENDPOINTS.AUTH.CLIENTE],
      ['rota fora da Surface', 'https://terceiro.example.com/api/v1/ordens-servico'],
      ['rota legada', '/api/ordem-servico'],
    ])('não envia o token em %s', (_nome, url) => {
      http.get(url).subscribe();
      const req = controller.expectOne(r => r.url === url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('preserva Authorization explícito (ex.: token do cliente na aprovação)', () => {
      const url = API_ENDPOINTS.ORCAMENTOS.APROVACAO('1');
      http.post(url, {}, { headers: { Authorization: 'Bearer token-cliente' } }).subscribe();
      const req = controller.expectOne(url);
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-cliente');
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

  it('401 fora do login limpa a sessão e leva a /login', () => {
    configurar('abc');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get(API_ENDPOINTS.ORDENS_SERVICO.BASE).subscribe({ error: () => undefined });
    const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BASE);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({ codigo: 'token_invalido' }, { status: 401, statusText: 'Unauthorized' });
    expect(storage.getItem('autoreparos_token')).toBeNull();
    expect(storage.getItem('autoreparos_user')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
