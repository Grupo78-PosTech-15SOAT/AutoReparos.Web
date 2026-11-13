import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { MENSAGENS_POR_CODIGO, MENSAGENS_POR_STATUS } from './error-catalog';
import { NotificationService } from '../ui/notification.service';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { API_ENDPOINTS } from '../config/api-endpoints';

const STATUS = [401, 403, 404, 409, 422, 503];
const CODIGOS = Object.keys(MENSAGENS_POR_CODIGO).filter(c => c !== 'dependencia_indisponivel');
const CASOS_CODIGO = STATUS.flatMap(status => CODIGOS.map(codigo => [status, codigo] as const));

describe('ErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let notificacao: NotificationService;
  let navegar: ReturnType<typeof vi.spyOn>;
  let storage: Storage;

  beforeEach(() => {
    const dados = new Map<string, string>([['autoreparos_token', 't'], ['autoreparos_user', '{}']]);
    storage = {
      get length() { return dados.size; },
      clear: () => dados.clear(),
      getItem: (k: string) => dados.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { dados.delete(k); },
      setItem: (k: string, v: string) => { dados.set(k, v); },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    notificacao = TestBed.inject(NotificationService);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => controller.verify());

  function falhar(status: number, corpo: unknown, url = API_ENDPOINTS.ORDENS_SERVICO.BASE) {
    http.get(url).subscribe({ error: () => undefined });
    controller.expectOne(url).flush(corpo, { status, statusText: 'x' });
  }

  it.each(CASOS_CODIGO)('status %i com codigo %s mostra a mensagem do catálogo', (status, codigo) => {
    falhar(status, { codigo });
    const toasts = notificacao.toasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe(MENSAGENS_POR_CODIGO[codigo]);
  });

  it.each(STATUS)('status %i com código desconhecido mostra a mensagem genérica do status', status => {
    falhar(status, { codigo: 'codigo_que_nao_existe' });
    const toasts = notificacao.toasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe(MENSAGENS_POR_STATUS[status].mensagem);
  });

  it.each(STATUS)('status %i sem corpo mostra a mensagem genérica do status', status => {
    falhar(status, null);
    expect(notificacao.toasts()[0].message).toBe(MENSAGENS_POR_STATUS[status].mensagem);
  });

  it('409 saga_em_andamento mostra o texto do plano', () => {
    falhar(409, { codigo: 'saga_em_andamento' });
    expect(notificacao.toasts()[0].message).toBe('A saga desta OS ainda está em andamento. Tente novamente em instantes.');
  });

  it('503 dependencia_indisponivel mostra a mensagem do código', () => {
    falhar(503, { codigo: 'dependencia_indisponivel' });
    expect(notificacao.toasts()[0].message).toBe(MENSAGENS_POR_CODIGO['dependencia_indisponivel']);
  });

  it('401 fora do login limpa a sessão e volta ao login', () => {
    falhar(401, { codigo: 'x' });
    expect(storage.getItem('autoreparos_token')).toBeNull();
    expect(storage.getItem('autoreparos_user')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('401 no login mostra falha de login e não redireciona', () => {
    falhar(401, {}, API_ENDPOINTS.AUTH.LOGIN);
    expect(notificacao.toasts()[0].title).toBe('Falha no Login');
    expect(navegar).not.toHaveBeenCalled();
    expect(storage.getItem('autoreparos_token')).toBe('t');
  });

  it('400 e 500 mantêm o tratamento próprio', () => {
    falhar(400, { message: 'ruim' });
    falhar(500, null);
    const msgs = notificacao.toasts().map(t => t.message);
    expect(msgs[0]).toBe('ruim');
    expect(msgs[1]).toBe('Não foi possível se comunicar com o backend.');
  });

  it('repassa o erro ao chamador', () => {
    let recebido = 0;
    http.get(API_ENDPOINTS.ORDENS_SERVICO.BASE).subscribe({ error: e => (recebido = e.status) });
    controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BASE).flush({}, { status: 409, statusText: 'x' });
    expect(recebido).toBe(409);
  });
});
