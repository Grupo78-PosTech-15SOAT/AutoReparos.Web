import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VeiculoService } from './veiculo.service';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';

describe('VeiculoService', () => {
  let service: VeiculoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        VeiculoService,
      ],
    });
    service = TestBed.inject(VeiculoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll retorna PagedResult de veículos', () => {
    let paged: any;
    service.getAll(1, 10).subscribe(res => (paged = res));

    const req = httpMock.expectOne(r => r.url === API_ENDPOINTS.VEICULOS.BASE && r.params.get('pageNumber') === '1');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [{ id: 'vei-1', placa: 'ABC1D23', marca: 'VW', modelo: 'Gol' }], totalItems: 1 });

    expect(paged.total).toBe(1);
    expect(paged.items[0].placa).toBe('ABC1D23');
  });

  it('getById busca veículo por id', () => {
    let veiculo: any;
    service.getById('vei-1').subscribe(res => (veiculo = res));

    const req = httpMock.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'vei-1', placa: 'ABC1D23' });

    expect(veiculo.id).toBe('vei-1');
  });

  it('getByClienteId busca veículos passando clienteId e pageSize=100', () => {
    let veiculos: any[] = [];
    service.getByClienteId('cli-99').subscribe(res => (veiculos = res));

    const req = httpMock.expectOne(r => r.url === API_ENDPOINTS.VEICULOS.BASE && r.params.get('clienteId') === 'cli-99');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush({ items: [{ id: 'vei-1', clienteId: 'cli-99', placa: 'ABC1D23' }] });

    expect(veiculos.length).toBe(1);
    expect(veiculos[0].id).toBe('vei-1');
  });

  it('criar faz POST /api/v1/veiculos com os dados do veículo', () => {
    const novo = {
      placa: 'ABC1D23',
      marca: 'Toyota',
      modelo: 'Corolla',
      anoFabricacao: 2022,
      anoModelo: 2023,
      chassi: '12345678901234567',
      renavam: '12345678901',
      clienteId: 'cli-1'
    };
    service.criar(novo).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.VEICULOS.BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(novo);
    req.flush({ id: 'vei-new', ...novo });
  });

  it('atualizar faz PUT /api/v1/veiculos/{id} enviando apenas os campos mutáveis', () => {
    const v = {
      id: 'vei-1',
      placa: 'ABC1D23',
      marca: 'Toyota',
      modelo: 'Yaris',
      anoFabricacao: 2021,
      anoModelo: 2022,
      chassi: '12345678901234567',
      renavam: '12345678901',
      clienteId: 'cli-1'
    };
    service.atualizar('vei-1', v).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      marca: 'Toyota',
      modelo: 'Yaris',
      anoFabricacao: 2021,
      anoModelo: 2022
    });
    req.flush({ id: 'vei-1' });
  });

  it('excluir faz DELETE /api/v1/veiculos/{id}', () => {
    service.excluir('vei-1').subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
