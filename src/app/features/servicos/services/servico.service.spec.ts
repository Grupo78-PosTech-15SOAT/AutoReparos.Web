import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ServicoService } from './servico.service';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';

describe('ServicoService', () => {
  let service: ServicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ServicoService,
      ],
    });
    service = TestBed.inject(ServicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar retorna array de servicos normalizados', () => {
    let resultado: any[] = [];
    service.listar().subscribe(res => (resultado = res));

    const req = httpMock.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'srv-1', nome: 'Alinhamento', precoUnitario: 120 }]);

    expect(resultado.length).toBe(1);
    expect(resultado[0].nome).toBe('Alinhamento');
    expect(resultado[0].precoUnitario).toBe(120);
  });

  it('getAll retorna PagedResult com paginação calculada', () => {
    let paged: any;
    service.getAll(1, 10).subscribe(res => (paged = res));

    httpMock.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush({ itens: [{ id: 'srv-1', nome: 'Balanceamento' }] });

    expect(paged.total).toBe(1);
    expect(paged.items.length).toBe(1);
  });

  it('criar envia precoUnitario e omite descricao em branco', () => {
    service.criar({ nome: 'Troca de Óleo', precoUnitario: 80 }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nome: 'Troca de Óleo',
      precoUnitario: 80,
      precoBase: 80,
      valorTabelado: 80,
    });
    req.flush({ id: 'srv-novo', nome: 'Troca de Óleo' });
  });

  it('criar inclui descricao quando fornecida', () => {
    service.criar({ nome: 'Revisão Geral', precoUnitario: 300, descricao: 'Revisão dos 50k km' }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(req.request.body.descricao).toBe('Revisão dos 50k km');
    req.flush({ id: 'srv-novo' });
  });
});
