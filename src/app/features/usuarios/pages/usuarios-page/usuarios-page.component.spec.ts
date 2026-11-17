import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuariosPageComponent } from './usuarios-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

const ANA = { id: 'usu-1', nomeCompleto: 'Ana Costa', email: 'ana@auto.com', tipo: 2 };

describe('UsuariosPage', () => {
  let fixture: ComponentFixture<UsuariosPageComponent>;
  let component: UsuariosPageComponent;
  let controller: HttpTestingController;

  function responderLista(itens: unknown[] = [ANA]): void {
    controller.expectOne(r => r.method === 'GET' && r.url === API_ENDPOINTS.USUARIOS.BASE).flush({ items: itens, totalItems: itens.length });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuariosPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsuariosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    controller.verify();
    vi.unstubAllGlobals();
  });

  describe('UsuariosPage acoes da linha', () => {
    it('usa app-page-container e botões de ícone Editar e Excluir com o nome do usuário', () => {
      responderLista();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-page-container')).not.toBeNull();
      expect(el.querySelector('.container')).toBeNull();
      const editar = el.querySelector('[aria-label="Editar Ana Costa"]') as HTMLButtonElement;
      const excluir = el.querySelector('[aria-label="Excluir Ana Costa"]') as HTMLButtonElement;
      expect(editar.className).toBe('btn btn-ghost btn-icon btn-sm');
      expect(excluir.className).toBe('btn btn-ghost btn-danger btn-icon btn-sm');
      expect(el.querySelector('.role-badge')!.className).toContain('atendente');
    });
  });

  it('edita nome e perfil com PUT e cria com POST', () => {
    responderLista();
    (fixture.nativeElement.querySelector('[aria-label="Editar Ana Costa"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.editandoId).toBe('usu-1');
    component.formUsuario.nome = 'Ana C. Costa';
    component.formUsuario.role = 'Administrador';
    component.salvar();
    const put = controller.expectOne(r => r.method === 'PUT' && r.url === API_ENDPOINTS.USUARIOS.BY_ID('usu-1'));
    expect(put.request.body).toEqual({ nomeCompleto: 'Ana C. Costa', tipo: 1 });
    put.flush(null);
    responderLista();
    expect(component.exibirModal).toBe(false);

    component.abrirModalNovo();
    expect(component.editandoId).toBeNull();
    component.formUsuario = { nome: 'Bruno', email: 'b@auto.com', role: 'Mecanico', senha: 'x' };
    component.salvar();
    controller.expectOne(r => r.method === 'POST' && r.url === API_ENDPOINTS.USUARIOS.BASE).flush({});
    responderLista();
    expect(component.getRoleClass(undefined)).toBe('sem-cargo');
  });

  it('exclui após confirmação e pagina', () => {
    responderLista();
    vi.stubGlobal('confirm', vi.fn(() => true));
    (fixture.nativeElement.querySelector('[aria-label="Excluir Ana Costa"]') as HTMLButtonElement).click();
    controller.expectOne(r => r.method === 'DELETE' && r.url === API_ENDPOINTS.USUARIOS.BY_ID('usu-1')).flush(null);
    responderLista([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhum usuário cadastrado.');

    component.onPageChange(2);
    responderLista();
    component.onPageSizeChange(20);
    controller.expectOne(r => r.url === API_ENDPOINTS.USUARIOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.pageNumber).toBe(1);
    expect(component.loading).toBe(false);

    vi.stubGlobal('confirm', vi.fn(() => false));
    component.excluir('usu-1');
    controller.expectNone(API_ENDPOINTS.USUARIOS.BY_ID('usu-1'));
  });
});
