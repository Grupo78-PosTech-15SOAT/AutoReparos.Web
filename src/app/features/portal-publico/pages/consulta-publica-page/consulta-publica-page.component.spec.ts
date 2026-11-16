import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConsultaPublicaPageComponent } from './consulta-publica-page.component';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

describe('ConsultaPublicaPage', () => {
  let fixture: ComponentFixture<ConsultaPublicaPageComponent>;
  let component: ConsultaPublicaPageComponent;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaPublicaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConsultaPublicaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('busca pelo código (ID) da OS em GET /api/v1/ordens-servico/{id} e mostra status e histórico', () => {
    component.codigo = 'os-abc-123';
    component.consultar();

    const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-abc-123'));
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'os-abc-123',
      clienteId: 'cli-1',
      veiculoId: 'vei-1',
      status: 'Concluida',
      historico: [
        { status: 'Recebida', registradoEm: '2026-11-16T09:00:00Z' },
        { status: 'Concluida', registradoEm: '2026-11-16T15:00:00Z' },
      ],
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('OS #os-abc-123');
    expect(texto).toContain('Concluída');
    expect(texto).toContain('Recebida');
  });

  it('mostra alerta quando a OS não é encontrada (404) e oferece apenas busca por código', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    expect(inputs).toHaveLength(1);
    expect(inputs[0].getAttribute('name')).toBe('codigo');

    component.codigo = 'os-nao-existe';
    component.consultar();

    controller
      .expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-nao-existe'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
    expect(alerta?.textContent).toContain('Nenhuma OS encontrada');
  });
});
