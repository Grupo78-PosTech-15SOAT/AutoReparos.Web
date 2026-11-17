import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InsumoService } from './insumo.service';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';

describe('InsumoService', () => {
  let service: InsumoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InsumoService,
      ],
    });
    service = TestBed.inject(InsumoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar retorna array de insumos normalizados suportando array direto ou objeto envolto', () => {
    let resultado: any[] = [];
    service.listar().subscribe(res => (resultado = res));

    const req = httpMock.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'ins-1', nome: 'Óleo 5W30', precoUnitario: 50, quantidadeDisponivel: 10 }] });

    expect(resultado.length).toBe(1);
    expect(resultado[0].nome).toBe('Óleo 5W30');
    expect(resultado[0].precoUnitario).toBe(50);
  });

  it('getAll retorna PagedResult com total e totalPages calculados', () => {
    let paged: any;
    service.getAll(1, 5).subscribe(res => (paged = res));

    httpMock.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([
      { id: '1', nome: 'A' },
      { id: '2', nome: 'B' },
    ]);

    expect(paged.total).toBe(2);
    expect(paged.totalPages).toBe(1);
    expect(paged.items.length).toBe(2);
  });

  it('criar envia payload com precoUnitario, quantidadeInicial e omite descricao vazia', () => {
    service.criar({ nome: 'Filtro', precoUnitario: 30, quantidadeInicial: 4 }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nome: 'Filtro',
      precoUnitario: 30,
      quantidadeInicial: 4,
      quantidadeDisponivel: 4,
      saldoDisponivel: 4,
    });
    req.flush({ id: 'ins-new', nome: 'Filtro' });
  });

  it('criar inclui descricao quando informada', () => {
    service.criar({ nome: 'Filtro', precoUnitario: 30, quantidadeInicial: 4, descricao: 'Filtro de Ar' }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(req.request.body.descricao).toBe('Filtro de Ar');
    req.flush({ id: 'ins-new', nome: 'Filtro' });
  });

  it('registrarEntrada envia { quantidade } numérico', () => {
    service.registrarEntrada('ins-1', { quantidade: 15 }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.INSUMOS.ENTRADAS('ins-1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ quantidade: 15 });
    req.flush({ id: 'ins-1', quantidadeDisponivel: 25 });
  });
});
