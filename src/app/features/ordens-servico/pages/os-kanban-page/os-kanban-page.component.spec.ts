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

describe('OsKanbanPage', () => {
  let fixture: ComponentFixture<OsKanbanPageComponent>;
  let component: OsKanbanPageComponent;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsKanbanPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => controller.verify());

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
});
