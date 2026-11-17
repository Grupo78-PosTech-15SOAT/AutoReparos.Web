import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OsCancelamentoComponent } from './os-cancelamento.component';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { MENSAGENS_POR_CODIGO } from '../../../../core/http/error-catalog';

describe('OsCancelamento', () => {
  let fixture: ComponentFixture<OsCancelamentoComponent>;
  let component: OsCancelamentoComponent;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsCancelamentoComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OsCancelamentoComponent);
    fixture.componentRef.setInput('osId', 'os-100');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('exige motivo obrigatório antes de enviar o cancelamento', () => {
    component.motivo = '   ';
    component.cancelar();
    controller.expectNone(API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO('os-100'));
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it('chama POST /api/v1/ordens-servico/{id}/cancelamento com o motivo, mostra o estado devolvido e emite cancelada', () => {
    const emitSpy = vi.fn();
    component.cancelada.subscribe(emitSpy);

    component.motivo = 'Cliente desistiu do reparo';
    component.cancelar();

    const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO('os-100'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Cliente desistiu do reparo' });
    req.flush({ estado: 'Compensando' }, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();

    const statusEl = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement | null;
    expect(statusEl?.textContent).toContain('Compensando');
    expect(emitSpy).toHaveBeenCalledWith({ estado: 'Compensando' });
  });

  it.each(['saga_em_andamento', 'cancelamento_indisponivel'] as const)(
    'em 409 %s mostra a mensagem do código do catálogo e mantém a OS sem emitir cancelada',
    codigo => {
      const emitSpy = vi.fn();
      component.cancelada.subscribe(emitSpy);

      component.motivo = 'Solicitação de cancelamento';
      component.cancelar();

      const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.CANCELAMENTO('os-100'));
      req.flush({ codigo }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      const alerta = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
      expect(alerta?.textContent).toBe(MENSAGENS_POR_CODIGO[codigo]);
      expect(emitSpy).not.toHaveBeenCalled();
    }
  );
});
