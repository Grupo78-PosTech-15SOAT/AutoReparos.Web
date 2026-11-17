import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientesPageComponent } from './clientes-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

const MARIA = { id: 'cli-1', nome: 'Maria Silva', documento: '12345678901', tipoDocumento: 'CPF' as const, email: 'm@x.com', telefone: '11999999999' };

describe('ClientesPage', () => {
  let fixture: ComponentFixture<ClientesPageComponent>;
  let component: ClientesPageComponent;
  let controller: HttpTestingController;

  function responderLista(itens = [MARIA]): void {
    controller.expectOne(r => r.method === 'GET' && r.url === API_ENDPOINTS.CLIENTES.BASE).flush({ items: itens, total: itens.length, totalPages: 1 });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClientesPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ClientesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    controller.verify();
    vi.unstubAllGlobals();
  });

  describe('ClientesPage acoes da linha', () => {
    it('mostra Editar e Excluir como botões de ícone com aria-label e nome do cliente', () => {
      responderLista();
      const el = fixture.nativeElement as HTMLElement;
      const editar = el.querySelector('[aria-label="Editar Maria Silva"]') as HTMLButtonElement;
      const excluir = el.querySelector('[aria-label="Excluir Maria Silva"]') as HTMLButtonElement;
      expect(editar.className).toBe('btn btn-ghost btn-icon btn-sm');
      expect(excluir.className).toBe('btn btn-ghost btn-danger btn-icon btn-sm');
      expect(editar.textContent!.trim()).toBe('');

      editar.click();
      fixture.detectChanges();
      expect(component.editandoId).toBe('cli-1');
      expect(component.exibirModal).toBe(true);
    });
  });

  it('exclui após confirmação e recarrega a lista', () => {
    responderLista();
    vi.stubGlobal('confirm', vi.fn(() => true));
    (fixture.nativeElement.querySelector('[aria-label="Excluir Maria Silva"]') as HTMLButtonElement).click();
    controller.expectOne(r => r.method === 'DELETE' && r.url === API_ENDPOINTS.CLIENTES.BY_ID('cli-1')).flush(null);
    responderLista([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhum cliente cadastrado.');
  });

  it('não exclui sem confirmação', () => {
    responderLista();
    vi.stubGlobal('confirm', vi.fn(() => false));
    component.excluir('cli-1');
    controller.expectNone(API_ENDPOINTS.CLIENTES.BY_ID('cli-1'));
  });

  it('cria e atualiza cliente e pagina', () => {
    responderLista();
    component.abrirModalNovo();
    component.formCliente = { ...MARIA, id: undefined, nome: 'Novo' };
    component.salvar();
    controller.expectOne(r => r.method === 'POST' && r.url === API_ENDPOINTS.CLIENTES.BASE).flush({});
    responderLista();
    expect(component.exibirModal).toBe(false);

    component.editar(MARIA as never);
    component.salvar();
    controller.expectOne(r => r.method === 'PUT' && r.url === API_ENDPOINTS.CLIENTES.BY_ID('cli-1')).flush({});
    responderLista();

    component.onPageChange(2);
    responderLista();
    expect(component.pageNumber).toBe(2);
    component.onPageSizeChange(20);
    controller.expectOne(r => r.url === API_ENDPOINTS.CLIENTES.BASE).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.pageNumber).toBe(1);
    expect(component.loading).toBe(false);
  });
});
