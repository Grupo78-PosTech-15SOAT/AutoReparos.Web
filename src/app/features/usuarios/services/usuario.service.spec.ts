import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuarioService } from './usuario.service';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';

describe('UsuarioService', () => {
  let service: UsuarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UsuarioService,
      ],
    });
    service = TestBed.inject(UsuarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll retorna lista paginada mapeando tipo numérico para role string', () => {
    let paged: any;
    service.getAll(1, 10).subscribe(res => (paged = res));

    const req = httpMock.expectOne(r => r.url === API_ENDPOINTS.USUARIOS.BASE);
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [
        { id: 'u-1', nomeCompleto: 'José Silva', tipo: 1, email: 'admin@auto.com' },
        { id: 'u-2', nomeCompleto: 'Ana Paula', tipo: 2, email: 'atendente@auto.com' },
        { id: 'u-3', nomeCompleto: 'Carlos Mecânico', tipo: 3, email: 'mec@auto.com' }
      ],
      total: 3
    });

    expect(paged.items.length).toBe(3);
    expect(paged.items[0].role).toBe('Administrador');
    expect(paged.items[1].role).toBe('Atendente');
    expect(paged.items[2].role).toBe('Mecanico');
  });

  it('criar mapeia role string para tipo numérico no backend', () => {
    service.criar({ nome: 'Mecânico Teste', email: 'm@auto.com', role: 'Mecanico', senha: '123' }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.USUARIOS.BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nomeCompleto: 'Mecânico Teste',
      email: 'm@auto.com',
      password: '123',
      tipo: 3
    });
    req.flush({ id: 'u-new' });
  });

  it('criar recusa com erro caso role não esteja no mapeamento', () => {
    let erroRecebido: Error | undefined;
    service.criar({ nome: 'Inválido', email: 'inv@auto.com', role: 'Gerente' as any, senha: '123' }).subscribe({
      error: (e: Error) => (erroRecebido = e),
    });
    expect(erroRecebido).toBeDefined();
    expect(erroRecebido?.message).toContain('Perfil de usuário inválido: Gerente');
    httpMock.expectNone(API_ENDPOINTS.USUARIOS.BASE);
  });

  it('atualizar faz PUT /api/v1/usuarios/{id} com tipo numérico', () => {
    service.atualizar('u-1', { nomeCompleto: 'Admin Editado', tipo: 'Administrador' }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.USUARIOS.BY_ID('u-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      nomeCompleto: 'Admin Editado',
      tipo: 1
    });
    req.flush(null);
  });

  it('atualizar recusa com erro caso tipo/role não seja válido', () => {
    let erroRecebido: Error | undefined;
    service.atualizar('u-1', { nomeCompleto: 'Erro', tipo: 'Invalido' }).subscribe({
      error: (e: Error) => (erroRecebido = e),
    });
    expect(erroRecebido).toBeDefined();
    expect(erroRecebido?.message).toContain('Perfil de usuário inválido: Invalido');
    httpMock.expectNone(API_ENDPOINTS.USUARIOS.BY_ID('u-1'));
  });

  it('excluir faz DELETE /api/v1/usuarios/{id}', () => {
    service.excluir('u-1').subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.USUARIOS.BY_ID('u-1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
