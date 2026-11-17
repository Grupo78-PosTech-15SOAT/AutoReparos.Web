import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OsKanbanPageComponent } from './os-kanban-page.component';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { STATUS_OS } from '../../../../shared/utils/status-os.utils';
import { AuthService } from '../../../auth/services/auth.service';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

describe('OsKanbanPage', () => {
  let fixture: ComponentFixture<OsKanbanPageComponent>;
  let component: OsKanbanPageComponent;
  let controller: HttpTestingController;
  let auth: AuthService;
  let store: OsJornadaStore;
  let memoria: Map<string, string>;

  beforeEach(async () => {
    memoria = new Map<string, string>();
    const storage: Storage = {
      get length() { return memoria.size; },
      clear: () => memoria.clear(),
      getItem: (k: string) => memoria.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { memoria.delete(k); },
      setItem: (k: string, v: string) => { memoria.set(k, v); },
    };

    await TestBed.configureTestingModule({
      imports: [OsKanbanPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
        OsJornadaStore,
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(OsJornadaStore);
    store.limpar();
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  /** Responde 404 às consultas de veículo e cliente pendentes (o cartão cai no id da OS). */
  function responderCadastros(): void {
    controller
      .match(r => r.url.includes('/veiculos/') || r.url.includes('/clientes/'))
      .forEach(r => r.flush(null, { status: 404, statusText: 'Not Found' }));
  }

  describe('OsKanban cards', () => {
    const OS_A = 'aaaaaaaa-1111-4111-8111-111111111111';
    const OS_B = 'bbbbbbbb-2222-4222-8222-222222222222';

    it('tem o título "Ordens de Serviço" e cada card mostra placa, modelo, cliente e o link "Detalhes" para /ordens-servico/<id>', () => {
      auth.currentUser.set({ email: 'm@x.com', nome: 'Mec', nomeCompleto: 'Mec', role: 'Mecanico' });
      fixture = TestBed.createComponent(OsKanbanPageComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const atualizada = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush({
        itens: [
          { id: 'exec-1', ordemServicoId: OS_A, clienteId: 'cli-1', veiculoId: 'vei-1', status: 'EmExecucao', atualizadaEm: atualizada },
          { id: 'exec-2', ordemServicoId: OS_B, clienteId: 'cli-1', veiculoId: 'vei-2', status: 'Concluida' },
        ],
      });
      controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1')).flush({
        id: 'vei-1', placa: 'abc1d23', modelo: 'Gol', marca: 'Volkswagen', anoFabricacao: 2020, anoModelo: 2021, clienteId: 'cli-1',
      });
      controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-2')).flush(null, { status: 500, statusText: 'Erro' });
      controller.expectOne(API_ENDPOINTS.CLIENTES.BY_ID('cli-1')).flush({
        id: 'cli-1', nome: 'João da Silva', email: 'j@x.com', telefone: '1', documento: '1', tipoDocumento: 'CPF',
      });
      fixture.detectChanges();

      const nativo = fixture.nativeElement as HTMLElement;
      expect(nativo.querySelector('h1')?.textContent?.trim()).toBe('Ordens de Serviço');
      expect(nativo.querySelector('.page-subtitle')?.textContent?.trim()).toBe('Quadro por etapa');
      expect(nativo.textContent).not.toContain('Kanban');
      expect(nativo.querySelector('.column-status-code')).toBeNull();
      const atualizar = nativo.querySelector('[data-testid="btn-atualizar-quadro"]') as HTMLButtonElement;
      expect(atualizar.getAttribute('aria-label')).toBe('Atualizar quadro');

      const cardA = nativo.querySelector('[data-status="EmExecucao"] [data-testid="kanban-card"]') as HTMLElement;
      expect(cardA.querySelector('app-placa-badge')?.textContent?.trim()).toBe('ABC-1D23');
      expect(cardA.querySelector('[data-testid="card-modelo"]')?.textContent?.trim()).toBe('Gol');
      expect(cardA.querySelector('[data-testid="card-cliente"]')?.textContent?.trim()).toBe('João da Silva');
      expect(cardA.querySelector('app-id-badge')?.textContent).toContain('#aaaaaaaa');
      expect(cardA.querySelector('time')?.textContent?.trim()).toBe('há 3 h');
      const linkA = cardA.querySelector('[data-testid="card-detalhes"]') as HTMLAnchorElement;
      expect(linkA.textContent?.trim()).toBe('Detalhes ›');
      expect(linkA.getAttribute('href')).toBe(`/ordens-servico/${OS_A}`);

      const cardB = nativo.querySelector('[data-status="Concluida"] [data-testid="kanban-card"]') as HTMLElement;
      expect(cardB.querySelector('app-placa-badge')).toBeNull();
      expect(cardB.querySelector('app-id-badge')?.textContent).toContain('#bbbbbbbb');
      expect((cardB.querySelector('[data-testid="card-detalhes"]') as HTMLAnchorElement).getAttribute('href')).toBe(`/ordens-servico/${OS_B}`);
    });

    it('não repete a consulta do veículo ao atualizar o quadro', () => {
      auth.currentUser.set({ email: 'm@x.com', nome: 'Mec', nomeCompleto: 'Mec', role: 'Mecanico' });
      fixture = TestBed.createComponent(OsKanbanPageComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      const fila = { itens: [{ id: 'exec-1', ordemServicoId: OS_A, veiculoId: 'vei-1', status: 'EmExecucao' }] };
      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush(fila);
      controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1')).flush({ id: 'vei-1', placa: 'ABC1D23', modelo: 'Gol', marca: 'VW' });

      (fixture.nativeElement.querySelector('[data-testid="btn-atualizar-quadro"]') as HTMLButtonElement).click();
      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush(fila);
      controller.expectNone(API_ENDPOINTS.VEICULOS.BY_ID('vei-1'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-placa-badge')?.textContent?.trim()).toBe('ABC-1D23');
    });
  });

  it('mostra as 7 colunas de status reais da OS, indicador de carregamento e estado vazio por coluna', () => {
    auth.currentUser.set({ email: 'm@x.com', nome: 'Mec', nomeCompleto: 'Mec', role: 'Mecanico' });
    fixture = TestBed.createComponent(OsKanbanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.carregando()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando fila'
    );

    const reqFila = controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA);
    expect(reqFila.request.method).toBe('GET');
    reqFila.flush({ itens: [] });
    fixture.detectChanges();

    expect(component.carregando()).toBe(false);
    const colunas = component.colunas();
    expect(colunas.map(c => c.status)).toEqual(STATUS_OS);
    expect(colunas).toHaveLength(7);

    for (const status of STATUS_OS) {
      const el = fixture.nativeElement.querySelector(`[data-status="${status}"]`) as HTMLElement | null;
      expect(el).not.toBeNull();
      expect(el?.textContent).toContain('Nenhuma OS nesta etapa');
    }
  });

  it('alimenta as colunas com fila de execução e sagas quando Administrador e busca rápida por código da OS', () => {
    auth.currentUser.set({
      email: 'admin@x.com',
      nome: 'Admin',
      nomeCompleto: 'Admin',
      role: 'Administrador',
    });
    fixture = TestBed.createComponent(OsKanbanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush({
      itens: [
        { id: 'exec-1', ordemServicoId: 'os-exec-1', status: 'EmExecucao' },
        { id: 'exec-2', ordemServicoId: 'os-conc-2', status: 'Concluida' },
        { id: 'exec-3', ordemServicoId: 'os-int-3', status: 'Falhou', intervencaoRequerida: true },
      ],
    });

    controller.expectOne(API_ENDPOINTS.SAGAS.BASE).flush([
      { ordemServicoId: 'os-orc-4', estado: 'ReservandoInsumos' },
      { ordemServicoId: 'os-paga-5', estado: 'PagamentoCapturado' },
      { ordemServicoId: 'os-canc-6', estado: 'Compensada' },
    ]);
    fixture.detectChanges();

    component.codigoBusca = 'os-rec-7';
    component.buscarPorCodigo();

    const reqOs = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-rec-7'));
    expect(reqOs.request.method).toBe('GET');
    reqOs.flush({
      id: 'os-rec-7',
      clienteId: 'cli-1',
      veiculoId: 'vei-1',
      observacao: 'Troca de óleo',
      status: 'Recebida',
      historico: [],
    });
    responderCadastros();
    fixture.detectChanges();

    const porStatus = Object.fromEntries(component.colunas().map(c => [c.status, c.cards.map(k => k.id)]));
    expect(porStatus['Recebida']).toEqual(['os-rec-7']);
    expect(porStatus['OrcamentoAprovado']).toEqual(['os-orc-4']);
    expect(porStatus['EmExecucao']).toEqual(['os-exec-1']);
    expect(porStatus['Concluida']).toEqual(['os-conc-2']);
    expect(porStatus['Paga']).toEqual(['os-paga-5']);
    expect(porStatus['IntervencaoRequerida']).toEqual(['os-int-3']);
    expect(porStatus['Cancelada']).toEqual(['os-canc-6']);
  });

  it('mostra alerta quando a busca rápida por código retorna 404', () => {
    auth.currentUser.set({ email: 'a@x.com', nome: 'Atend', nomeCompleto: 'Atend', role: 'Atendente' });
    fixture = TestBed.createComponent(OsKanbanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush(
      { codigo: 'acesso_negado' },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    component.codigoBusca = 'os-inexistente';
    component.buscarPorCodigo();

    controller
      .expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-inexistente'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
    expect(alerta?.textContent).toContain('OS não encontrada');
  });

  it('exibe banner de sem acesso à execução quando Atendente recebe 403 da fila', () => {
    auth.currentUser.set({ email: 'atend@auto.com', nome: 'Atendente', nomeCompleto: 'Atendente', role: 'Atendente' });
    fixture = TestBed.createComponent(OsKanbanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush(
      { codigo: 'acesso_negado' },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    expect(component.acessoExecucaoRestrito()).toBe(true);
    const banner = fixture.nativeElement.querySelector('[data-testid="aviso-execucao-restrita"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Sem acesso à fila de execução');
  });

  it('exibe aviso de erro genérico quando a fila de execução retorna erro diferente de 403 (ex: 500)', () => {
    auth.currentUser.set({ email: 'm@auto.com', nome: 'Mec', nomeCompleto: 'Mec', role: 'Mecanico' });
    fixture = TestBed.createComponent(OsKanbanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush(
      { codigo: 'erro_interno' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();

    expect(component.erroFila()).toBe('Não foi possível carregar a fila de execução.');
    const bannerErro = fixture.nativeElement.querySelector('[data-testid="aviso-erro-fila"]');
    expect(bannerErro).not.toBeNull();
    expect(bannerErro?.textContent).toContain('Não foi possível carregar a fila de execução.');
  });

  it('inclui OS do atalho OsJornadaStore revalidada por GET /api/v1/ordens-servico/{id} inclusive para Atendente', () => {
    store.salvar({ osId: 'os-jornada-1' });
    auth.currentUser.set({ email: 'atend@auto.com', nome: 'Atendente', nomeCompleto: 'Atendente', role: 'Atendente' });
    fixture = TestBed.createComponent(OsKanbanPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush(
      { codigo: 'acesso_negado' },
      { status: 403, statusText: 'Forbidden' }
    );

    const reqOs = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-jornada-1'));
    expect(reqOs.request.method).toBe('GET');
    reqOs.flush({
      id: 'os-jornada-1',
      clienteId: 'cli-1',
      veiculoId: 'vei-1',
      status: 'Recebida',
      observacao: 'Troca de pastilhas',
      historico: [],
    });
    responderCadastros();
    fixture.detectChanges();

    const porStatus = Object.fromEntries(component.colunas().map(c => [c.status, c.cards.map(k => k.id)]));
    expect(porStatus['Recebida']).toContain('os-jornada-1');
  });
});
