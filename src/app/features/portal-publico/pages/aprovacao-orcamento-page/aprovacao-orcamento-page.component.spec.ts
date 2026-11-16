import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AprovacaoOrcamentoPageComponent } from './aprovacao-orcamento-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { MENSAGENS_POR_CODIGO, MENSAGENS_POR_STATUS } from '../../../../core/http/error-catalog';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { jwtInterceptor } from '../../../../core/http/jwt.interceptor';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';

describe('AprovacaoOrcamentoPage', () => {
  let fixture: ComponentFixture<AprovacaoOrcamentoPageComponent>;
  let component: AprovacaoOrcamentoPageComponent;
  let controller: HttpTestingController;

  beforeEach(async () => {
    const memoria = new Map<string, string>();
    const storage: Storage = {
      get length() { return memoria.size; },
      clear: () => memoria.clear(),
      getItem: (k: string) => memoria.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { memoria.delete(k); },
      setItem: (k: string, v: string) => { memoria.set(k, v); },
    };

    await TestBed.configureTestingModule({
      imports: [AprovacaoOrcamentoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ orcamentoId: 'orc-555' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AprovacaoOrcamentoPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('autentica o cliente em POST /auth/cliente e aprova em POST /api/v1/orcamentos/{id}/aprovacao com o JWT retornado, exibindo pagamentoId', () => {
    fixture.detectChanges();
    expect(component.orcamentoId).toBe('orc-555');

    component.cpf = '12345678901';
    component.email = 'cliente@auto.com';
    component.aprovar();

    const reqAuth = controller.expectOne(API_ENDPOINTS.AUTH.CLIENTE);
    expect(reqAuth.request.method).toBe('POST');
    expect(reqAuth.request.body).toEqual({ cpf: '12345678901', email: 'cliente@auto.com' });
    reqAuth.flush({ token: 'jwt-cliente-rs256' });

    const reqAprovacao = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.APROVACAO('orc-555'));
    expect(reqAprovacao.request.method).toBe('POST');
    expect(reqAprovacao.request.headers.get('Authorization')).toBe('Bearer jwt-cliente-rs256');
    reqAprovacao.flush({ id: 'orc-555', status: 'Aprovado', pagamentoId: 'pag-777' });

    fixture.detectChanges();
    const confirmacao = fixture.nativeElement.querySelector('[data-testid="confirmacao-aprovacao"]').textContent as string;
    expect(confirmacao).toContain('Orçamento Aprovado!');
    expect(confirmacao).toContain('pag-777');
  });

  it.each([
    [401, null, MENSAGENS_POR_STATUS[401].mensagem],
    [403, null, MENSAGENS_POR_STATUS[403].mensagem],
    [404, null, MENSAGENS_POR_STATUS[404].mensagem],
    [409, { codigo: 'orcamento_nao_pendente' }, MENSAGENS_POR_CODIGO['orcamento_nao_pendente']],
  ])('exibe mensagem de erro na tela quando a aprovação responde %i', (status, corpo, esperado) => {
    fixture.detectChanges();
    component.orcamentoId = 'orc-555';
    component.cpf = '12345678901';
    component.email = 'cliente@auto.com';
    component.aprovar();

    controller.expectOne(API_ENDPOINTS.AUTH.CLIENTE).flush({ token: 'jwt-1' });
    controller.expectOne(API_ENDPOINTS.ORCAMENTOS.APROVACAO('orc-555')).flush(corpo, { status, statusText: 'Erro' });
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('[data-testid="erro-aprovacao"]').textContent as string;
    expect(alerta).toContain(esperado);
    expect(component.aprovacao()).toBeNull();
  });

  it('exibe mensagem de erro quando POST /auth/cliente responde 401', () => {
    fixture.detectChanges();
    component.orcamentoId = 'orc-555';
    component.cpf = '00000000000';
    component.email = 'invalido@auto.com';
    component.aprovar();

    controller.expectOne(API_ENDPOINTS.AUTH.CLIENTE).flush({ codigo: 'token_invalido' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(component.erro()).toBe(MENSAGENS_POR_CODIGO['token_invalido']);
  });
});
