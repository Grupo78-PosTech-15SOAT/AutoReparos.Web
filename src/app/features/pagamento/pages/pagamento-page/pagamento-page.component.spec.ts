import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PagamentoPageComponent } from './pagamento-page.component';
import { AuthService } from '../../../auth/services/auth.service';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

describe('PagamentoPage', () => {
  let fixture: ComponentFixture<PagamentoPageComponent>;
  let component: PagamentoPageComponent;
  let controller: HttpTestingController;
  let auth: AuthService;

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
      imports: [PagamentoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'pag-100' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(PagamentoPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('chama POST /api/v1/pagamentos/{id}/checkout ao acionar Iniciar checkout e exibe a urlCheckout', () => {
    auth.currentUser.set({ email: 'atendente@auto.com', role: 'Atendente' });
    fixture.detectChanges();

    expect(component.pagamentoId).toBe('pag-100');
    expect(fixture.nativeElement.querySelector('[data-testid="secao-reembolso"]')).toBeNull();

    component.iniciarCheckout();

    const req = controller.expectOne(API_ENDPOINTS.PAGAMENTOS.CHECKOUT('pag-100'));
    expect(req.request.method).toBe('POST');
    req.flush({
      pagamentoId: 'pag-100',
      urlCheckout: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123',
    });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('[data-testid="link-url-checkout"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123');
    expect(link.textContent).toContain('https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123');
  });

  it('exibe seção de reembolso para Administrador e envia POST /api/v1/pagamentos/{id}/reembolsos com valor, motivo e referencia', () => {
    auth.currentUser.set({ email: 'admin@auto.com', role: 'Administrador' });
    fixture.detectChanges();

    const secao = fixture.nativeElement.querySelector('[data-testid="secao-reembolso"]');
    expect(secao).not.toBeNull();

    component.valorReembolso = 150.5;
    component.motivoReembolso = 'Cancelamento de serviço';
    component.referenciaReembolso = 'REF-2026-01';
    component.solicitarReembolso();

    const req = controller.expectOne(API_ENDPOINTS.PAGAMENTOS.REEMBOLSOS('pag-100'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      valor: 150.5,
      motivo: 'Cancelamento de serviço',
      referencia: 'REF-2026-01',
    });
    req.flush({
      id: 'reb-1',
      pagamentoId: 'pag-100',
      valor: 150.5,
      motivo: 'Cancelamento de serviço',
      referencia: 'REF-2026-01',
      status: 'Processado',
    });
    fixture.detectChanges();

    const confirmacao = fixture.nativeElement.querySelector('[data-testid="reembolso-confirmacao"]').textContent as string;
    expect(confirmacao).toContain('Reembolso registrado com sucesso');
    expect(confirmacao).toContain('REF-2026-01');
  });

  it('aceita initPoint no checkout e trata falhas de rede limpando estados de envio', () => {
    auth.currentUser.set({ email: 'admin@auto.com', role: 'Administrador' });
    fixture.detectChanges();

    component.iniciarCheckout();
    controller.expectOne(API_ENDPOINTS.PAGAMENTOS.CHECKOUT('pag-100')).flush({ initPoint: 'https://mp.com/init' });
    expect(component.checkout()?.urlCheckout).toBe('https://mp.com/init');

    component.iniciarCheckout();
    controller.expectOne(API_ENDPOINTS.PAGAMENTOS.CHECKOUT('pag-100')).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.enviandoCheckout()).toBe(false);

    component.valorReembolso = 50;
    component.motivoReembolso = 'Teste';
    component.referenciaReembolso = 'REF-X';
    component.solicitarReembolso();
    controller.expectOne(API_ENDPOINTS.PAGAMENTOS.REEMBOLSOS('pag-100')).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.enviandoReembolso()).toBe(false);
  });

  it('oferece opções de atalho via app-custom-select e permite selecionar pagamento', () => {
    const store = TestBed.inject(OsJornadaStore);
    store.salvar({ osId: 'os-555', pagamentoId: 'pag-999' });
    fixture.detectChanges();

    expect(component.osOptions().length).toBe(1);
    expect(component.osOptions()[0].value).toBe('pag-999');

    component.selecionarOs('pag-999');
    expect(component.pagamentoId).toBe('pag-999');
  });
});
