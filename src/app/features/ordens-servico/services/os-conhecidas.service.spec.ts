import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OsConhecidasService, OsEnriquecida, opcaoDeOs, ordenarParaOrcamento } from './os-conhecidas.service';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { OsJornadaStore } from '../../../core/store/os-jornada.store';
import { AuthService } from '../../auth/services/auth.service';
import { STORAGE_TOKEN } from '../../../core/tokens/storage.token';

const OS_LOCAL = 'aaaaaaaa-1111-4111-8111-111111111111';
const OS_SAGA = 'bbbbbbbb-2222-4222-8222-222222222222';
const OS_FILA = 'cccccccc-3333-4333-8333-333333333333';
const VEIC = 'vvvvvvvv-0000-4000-8000-000000000001';
const CLI = 'cccccccc-0000-4000-8000-000000000002';

function memoria(): Storage {
  const dados = new Map<string, string>();
  return {
    get length() { return dados.size; },
    clear: () => dados.clear(),
    getItem: (k: string) => dados.get(k) ?? null,
    key: () => null,
    removeItem: (k: string) => { dados.delete(k); },
    setItem: (k: string, v: string) => { dados.set(k, v); },
  };
}

describe('OsConhecidas', () => {
  let service: OsConhecidasService;
  let http: HttpTestingController;
  let admin = true;

  beforeEach(() => {
    admin = true;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: memoria() },
        { provide: AuthService, useValue: { hasRole: (roles: string[]) => admin && roles.includes('Administrador') } },
      ],
    });
    service = TestBed.inject(OsConhecidasService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(OsJornadaStore).salvar({ osId: OS_LOCAL });
  });

  afterEach(() => http.verify());

  function responderOs(id: string, veiculoId = VEIC, clienteId = CLI, status = 'Recebida') {
    http.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID(id)).flush({ id, clienteId, veiculoId, status, historico: [] });
  }

  describe('OsConhecidas agregacao', () => {
    it('junta atalho local, Sagas e fila sem repetir e enriquece com veículo e cliente', () => {
      let resultado: OsEnriquecida[] = [];
      service.carregar().subscribe(r => (resultado = r));

      http.expectOne(API_ENDPOINTS.SAGAS.BASE).flush([{ ordemServicoId: OS_SAGA, estado: 'ReservandoInsumos' }, { ordemServicoId: OS_LOCAL, estado: 'X' }]);
      http.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([{ id: 'e1', ordemServicoId: OS_FILA, status: 'Fila' }]);

      responderOs(OS_LOCAL, VEIC, CLI, 'Recebida');
      responderOs(OS_SAGA, 'v2', 'c2', 'OrcamentoAprovado');
      responderOs(OS_FILA, 'v3', 'c3', 'EmExecucao');

      http.expectOne(API_ENDPOINTS.VEICULOS.BY_ID(VEIC)).flush({ id: VEIC, placa: 'ABC1D23', modelo: 'Gol 1.0', marca: 'VW', clienteId: CLI });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID(CLI)).flush({ id: CLI, nome: 'João da Silva', documento: '12345678909' });
      http.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('v2')).flush({ id: 'v2', placa: 'XYZ9K88', modelo: 'Onix', marca: 'Chevrolet' });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID('c2')).flush({ id: 'c2', nome: 'Maria' });
      http.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('v3')).flush({ id: 'v3', placa: 'DEF4G56', modelo: 'HB20', marca: 'Hyundai' });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID('c3')).flush({ id: 'c3', nome: 'Ana' });

      expect(resultado.map(o => o.id)).toEqual([OS_LOCAL, OS_SAGA, OS_FILA]);
      expect(resultado[0]).toEqual({
        id: OS_LOCAL,
        codigo: '#aaaaaaaa',
        status: 'Recebida',
        clienteId: CLI,
        veiculoId: VEIC,
        placa: 'ABC1D23',
        modelo: 'Gol 1.0',
        marca: 'VW',
        clienteNome: 'João da Silva',
        clienteDocumento: '12345678909',
      });
    });

    it('sem perfil Administrador não consulta as Sagas', () => {
      admin = false;
      let resultado: OsEnriquecida[] | null = null;
      service.carregar().subscribe(r => (resultado = r));
      http.expectNone(API_ENDPOINTS.SAGAS.BASE);
      http.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);
      responderOs(OS_LOCAL);
      http.expectOne(API_ENDPOINTS.VEICULOS.BY_ID(VEIC)).flush({ id: VEIC, placa: 'ABC1D23', modelo: 'Gol' });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID(CLI)).flush({ id: CLI, nome: 'João' });
      expect(resultado!.map(o => o.id)).toEqual([OS_LOCAL]);
    });

    it('fila com 403 e OS com 404 são ignoradas e o resto volta', () => {
      let resultado: OsEnriquecida[] = [];
      service.carregar().subscribe(r => (resultado = r));
      http.expectOne(API_ENDPOINTS.SAGAS.BASE).flush([{ ordemServicoId: OS_SAGA, estado: 'X' }]);
      http.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush({}, { status: 403, statusText: 'Forbidden' });
      http.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID(OS_LOCAL)).flush({}, { status: 404, statusText: 'Not Found' });
      responderOs(OS_SAGA);
      http.expectOne(API_ENDPOINTS.VEICULOS.BY_ID(VEIC)).flush({ id: VEIC, placa: 'ABC1D23', modelo: 'Gol' });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID(CLI)).flush({ id: CLI, nome: 'João' });
      expect(resultado.map(o => o.id)).toEqual([OS_SAGA]);
    });

    it('falha de veículo ou de cliente deixa os campos vazios', () => {
      let resultado: OsEnriquecida | null = null;
      service.resolver(OS_LOCAL).subscribe(r => (resultado = r));
      responderOs(OS_LOCAL);
      http.expectOne(API_ENDPOINTS.VEICULOS.BY_ID(VEIC)).flush({}, { status: 403, statusText: 'Forbidden' });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID(CLI)).flush({}, { status: 500, statusText: 'Erro' });
      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(OS_LOCAL);
      expect(resultado!.placa).toBeUndefined();
      expect(resultado!.modelo).toBeUndefined();
      expect(resultado!.clienteNome).toBeUndefined();
    });

    it('resolver devolve null quando a OS não existe', () => {
      let resultado: OsEnriquecida | null | undefined;
      service.resolver(OS_FILA).subscribe(r => (resultado = r));
      http.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID(OS_FILA)).flush({}, { status: 404, statusText: 'Not Found' });
      expect(resultado).toBeNull();
    });

    it('opcaoDeOs monta rótulo, descrição e palavras-chave', () => {
      const opcao = opcaoDeOs({ id: OS_LOCAL, codigo: '#aaaaaaaa', status: 'Recebida', placa: 'abc1d23', modelo: 'Gol 1.0', marca: 'VW', clienteNome: 'João' });
      expect(opcao.value).toBe(OS_LOCAL);
      expect(opcao.label).toBe('#aaaaaaaa · ABC-1D23 · Gol 1.0');
      expect(opcao.descricao).toBe('João · Recebida');
      expect(opcao.palavrasChave).toContain(OS_LOCAL);
      expect(opcao.palavrasChave).toContain('VW');
    });

    it('ordenarParaOrcamento põe Recebida primeiro e mantém a ordem do resto', () => {
      const lista = [
        { id: '1', codigo: '#1', status: 'Concluida' },
        { id: '2', codigo: '#2', status: 'Recebida' },
        { id: '3', codigo: '#3', status: 'EmExecucao' },
        { id: '4', codigo: '#4', status: 'Recebida' },
      ];
      expect(ordenarParaOrcamento(lista).map(o => o.id)).toEqual(['2', '4', '1', '3']);
    });
  });

  describe('OsConhecidas cache', () => {
    it('duas OS com o mesmo veículo geram um único GET do veículo', () => {
      let a: OsEnriquecida | null = null;
      let b: OsEnriquecida | null = null;
      service.resolver(OS_LOCAL).subscribe(r => (a = r));
      service.resolver(OS_SAGA).subscribe(r => (b = r));
      responderOs(OS_LOCAL, VEIC, CLI);
      responderOs(OS_SAGA, VEIC, CLI);
      const reqs = http.match(API_ENDPOINTS.VEICULOS.BY_ID(VEIC));
      expect(reqs).toHaveLength(1);
      reqs[0].flush({ id: VEIC, placa: 'ABC1D23', modelo: 'Gol' });
      http.expectOne(API_ENDPOINTS.CLIENTES.BY_ID(CLI)).flush({ id: CLI, nome: 'João' });
      expect(a!.placa).toBe('ABC1D23');
      expect(b!.placa).toBe('ABC1D23');

      let c: unknown = null;
      service.veiculo(VEIC).subscribe(v => (c = v));
      http.expectNone(API_ENDPOINTS.VEICULOS.BY_ID(VEIC));
      expect(c).toEqual({ id: VEIC, placa: 'ABC1D23', modelo: 'Gol' });
    });

    it('veiculo sem id não faz requisição', () => {
      let r: unknown = 'x';
      service.veiculo(undefined).subscribe(v => (r = v));
      expect(r).toBeNull();
    });
  });
});
