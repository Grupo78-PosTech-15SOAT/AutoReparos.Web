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
    fixture.detectChanges();

    const porStatus = Object.fromEntries(component.colunas().map(c => [c.status, c.cards.map(k => k.id)]));
    expect(porStatus['Recebida']).toContain('os-jornada-1');
  });
});
