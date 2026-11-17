import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { OsNovaPageComponent } from './os-nova-page.component';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { MENSAGENS_POR_CODIGO, MENSAGENS_POR_STATUS } from '../../../../core/http/error-catalog';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

describe('OsNovaPage', () => {
  let fixture: ComponentFixture<OsNovaPageComponent>;
  let component: OsNovaPageComponent;
  let controller: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsNovaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(OsNovaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller
      .expectOne(req => req.url === API_ENDPOINTS.CLIENTES.BASE)
      .flush({
        items: [
          { id: 'cli-1', nome: 'Maria Silva', documento: '12345678901', email: 'm@x.com', telefone: '11999999999' },
        ],
      });

    controller
      .expectOne(req => req.url === API_ENDPOINTS.VEICULOS.BASE)
      .flush({
        items: [
          { id: 'vei-1', clienteId: 'cli-1', placa: 'ABC1D23', marca: 'Ford', modelo: 'Ka', ano: 2022 },
          { id: 'vei-2', clienteId: 'cli-2', placa: 'XYZ9K88', marca: 'Fiat', modelo: 'Uno', ano: 2021 },
        ],
      });

    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('seleciona cliente e veículo, envia POST /api/v1/ordens-servico e abre o detalhe da OS criada', () => {
    component.onClienteSelect('cli-1');
    expect(component.veiculoId).toBe('vei-1');
    component.observacao = 'Ruído na suspensão dianteira';
    component.salvarRascunho();
    fixture.detectChanges();

    component.salvarOS();

    const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      clienteId: 'cli-1',
      veiculoId: 'vei-1',
      observacao: 'Ruído na suspensão dianteira',
    });

    req.flush({ id: 'os-12345678', status: 'Recebida' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(navegar).toHaveBeenCalledWith(['/ordens-servico', 'os-12345678']);
    const store = TestBed.inject(OsJornadaStore);
    expect(store.obter('os-12345678')).toBeDefined();
    expect(store.obter('os-12345678')?.clienteId).toBe('cli-1');
    expect(store.obter('os-12345678')?.veiculoId).toBe('vei-1');
  });

  it('mostra o erro 422 no formulário e não redireciona quando a criação falha', () => {
    component.onClienteSelect('cli-1');
    component.onVeiculoSelect('vei-2');
    fixture.detectChanges();

    component.salvarOS();

    const req = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BASE);
    expect(req.request.method).toBe('POST');
    req.flush(
      { codigo: 'veiculo_de_outro_cliente' },
      { status: 422, statusText: 'Unprocessable Entity' }
    );
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
    expect(alerta).not.toBeNull();
    expect(alerta?.textContent).toContain(MENSAGENS_POR_CODIGO['veiculo_de_outro_cliente']);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('exibe aviso de validação quando tenta salvar sem cliente ou veículo e permite cancelar', () => {
    component.clienteId = '';
    component.veiculoId = '';
    component.salvarOS();
    fixture.detectChanges();

    expect(component.erroFormulario).toContain('Selecione o cliente e o veículo');

    component.cancelar();
    expect(navegar).toHaveBeenCalledWith(['/ordens-servico/fila']);
  });
});
