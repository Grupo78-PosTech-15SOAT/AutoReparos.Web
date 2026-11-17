import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VeiculosPageComponent } from './veiculos-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

const GOL = { id: 'vei-1', placa: 'ABC1D23', marca: 'VW', modelo: 'Gol', anoFabricacao: 2020, anoModelo: 2021, chassi: '9BWZZZ377VT004251', renavam: '00123456789', clienteId: 'cli-1' };
const MARIA = { id: 'cli-1', nome: 'Maria Silva', documento: '12345678901' };

describe('VeiculosPage', () => {
  let fixture: ComponentFixture<VeiculosPageComponent>;
  let component: VeiculosPageComponent;
  let controller: HttpTestingController;

  function responder(veiculos: unknown[] = [GOL], clientes: unknown[] = [MARIA]): void {
    controller.expectOne(r => r.method === 'GET' && r.url === API_ENDPOINTS.VEICULOS.BASE).flush({ items: veiculos, total: veiculos.length, totalPages: 1 });
    controller.expectOne(r => r.method === 'GET' && r.url === API_ENDPOINTS.CLIENTES.BASE).flush({ items: clientes, total: clientes.length, totalPages: 1 });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VeiculosPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(VeiculosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    controller.verify();
    vi.unstubAllGlobals();
  });

  describe('VeiculosPage acoes da linha', () => {
    it('mostra Editar e Excluir como botões de ícone com a placa no aria-label', () => {
      responder();
      const el = fixture.nativeElement as HTMLElement;
      const editar = el.querySelector('[aria-label="Editar ABC1D23"]') as HTMLButtonElement;
      const excluir = el.querySelector('[aria-label="Excluir ABC1D23"]') as HTMLButtonElement;
      expect(editar.className).toBe('btn btn-ghost btn-icon btn-sm');
      expect(excluir.className).toBe('btn btn-ghost btn-danger btn-icon btn-sm');
      expect(el.textContent).toContain('Maria Silva');

      editar.click();
      fixture.detectChanges();
      expect(component.editandoId).toBe('vei-1');
    });

    it('mostra o documento formatado nas opções de cliente', () => {
      responder();
      expect(component.clienteOptions).toEqual([
        { value: 'cli-1', label: 'Maria Silva', descricao: '123.456.789-01', palavrasChave: '12345678901' },
      ]);
      expect(component.getClienteNome('outro')).toBe('Desconhecido');
    });
  });

  it('exclui após confirmação, cria, atualiza e pagina', () => {
    responder();
    vi.stubGlobal('confirm', vi.fn(() => true));
    (fixture.nativeElement.querySelector('[aria-label="Excluir ABC1D23"]') as HTMLButtonElement).click();
    controller.expectOne(r => r.method === 'DELETE' && r.url === API_ENDPOINTS.VEICULOS.BY_ID('vei-1')).flush(null);
    responder([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhum veículo cadastrado.');

    component.abrirModalNovo();
    component.formVeiculo = { ...GOL, id: undefined };
    component.salvar();
    controller.expectOne(r => r.method === 'POST' && r.url === API_ENDPOINTS.VEICULOS.BASE).flush({});
    responder();

    component.editar(GOL as never);
    component.salvar();
    controller.expectOne(r => r.method === 'PUT' && r.url === API_ENDPOINTS.VEICULOS.BY_ID('vei-1')).flush({});
    responder();

    component.onPageChange(2);
    responder();
    component.onPageSizeChange(20);
    controller.expectOne(r => r.url === API_ENDPOINTS.VEICULOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    controller.expectOne(r => r.url === API_ENDPOINTS.CLIENTES.BASE).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.pageNumber).toBe(1);
    expect(component.loading).toBe(false);
    expect(component.loadingClientes).toBe(false);

    vi.stubGlobal('confirm', vi.fn(() => false));
    component.excluir('vei-1');
    controller.expectNone(API_ENDPOINTS.VEICULOS.BY_ID('vei-1'));
  });
});
