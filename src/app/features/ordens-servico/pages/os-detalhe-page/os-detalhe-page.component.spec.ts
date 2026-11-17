import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OsDetalhePageComponent } from './os-detalhe-page.component';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { AuthService } from '../../../auth/services/auth.service';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';

describe('OsDetalhePage', () => {
  let fixture: ComponentFixture<OsDetalhePageComponent>;
  let component: OsDetalhePageComponent;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    const memoria = new Map<string, string>();
    const storage: Storage = {
      get length() { return memoria.size; },
      clear: () => memoria.clear(),
      getItem: (k: string) => memoria.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { memoria.delete(k); },
      setItem: (k: string, v: string) => { memoria.set(k, v); },
    };

    await TestBed.configureTestingModule({
      imports: [OsDetalhePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.currentUser.set({
      email: 'admin@x.com',
      nome: 'Admin',
      nomeCompleto: 'Admin',
      role: 'Administrador',
    });
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  it('mostra status, observação, histórico, estado da execução e ações de orçamento, pagamento e cancelamento', () => {
    fixture = TestBed.createComponent(OsDetalhePageComponent);
    fixture.componentRef.setInput('id', 'os-11112222');
    component = fixture.componentInstance;
    fixture.detectChanges();

    const reqOs = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-11112222'));
    expect(reqOs.request.method).toBe('GET');
    reqOs.flush({
      id: 'os-11112222',
      clienteId: 'cli-99998888',
      veiculoId: 'vei-77776666',
      observacao: 'Vazamento de fluido',
      status: 'EmExecucao',
      historico: [
        { status: 'Recebida', registradoEm: '2026-11-16T10:00:00Z' },
        { status: 'EmExecucao', registradoEm: '2026-11-16T11:00:00Z' },
      ],
    });

    const reqExec = controller.expectOne(
      req =>
        req.url === API_ENDPOINTS.EXECUCAO.FILA &&
        req.params.get('status') === 'Fila,EmExecucao,Concluida,Falhou,Cancelada'
    );
    expect(reqExec.request.method).toBe('GET');
    reqExec.flush({
      itens: [
        {
          id: 'exec-1',
          ordemServicoId: 'os-11112222',
          status: 'EmExecucao',
          mecanicoId: 'mec-12345678',
        },
      ],
    });

    const reqSaga = controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID('os-11112222'));
    reqSaga.flush({ ordemServicoId: 'os-11112222', orcamentoId: 'orc-5555' });

    const reqCli = controller.expectOne(API_ENDPOINTS.CLIENTES.BY_ID('cli-99998888'));
    reqCli.flush({ id: 'cli-99998888', nome: 'Carlos Cliente', documento: '123.456.789-00' });

    const reqVei = controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-77776666'));
    reqVei.flush({ id: 'vei-77776666', modelo: 'Civic', placa: 'ABC1D23' });

    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Em Execução');
    expect(texto).toContain('Vazamento de fluido');
    expect(texto).toContain('Recebida');
    expect(texto).toContain('EmExecucao');
    expect(texto).toContain('Carlos Cliente');
    expect(texto).toContain('Civic');
    expect(texto).toContain('Montar orçamento');
    expect(texto).toContain('Link aprovação cliente');
    expect(texto).toContain('Abrir pagamento');
    expect(fixture.nativeElement.querySelector('app-os-cancelamento')).not.toBeNull();
    const linkAprovacao = fixture.nativeElement.querySelector('[data-testid="link-aprovar-orcamento"]');
    expect(linkAprovacao.getAttribute('href')).toContain('orcamentoId=orc-5555');
    expect(linkAprovacao.getAttribute('href')).not.toContain('cpf=');
    expect(linkAprovacao.getAttribute('href')).not.toContain('email=');
  });

  it('salva a observação em PATCH /api/v1/ordens-servico/{id}', () => {
    fixture = TestBed.createComponent(OsDetalhePageComponent);
    fixture.componentRef.setInput('id', 'os-11112222');
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-11112222')).flush({
      id: 'os-11112222',
      clienteId: 'cli-1',
      veiculoId: 'vei-1',
      observacao: 'Observação inicial',
      status: 'Recebida',
      historico: [],
    });
    controller
      .expectOne(req => req.url === API_ENDPOINTS.EXECUCAO.FILA)
      .flush({ itens: [] });
    controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID('os-11112222')).flush({ ordemServicoId: 'os-11112222' });
    controller.expectOne(API_ENDPOINTS.CLIENTES.BY_ID('cli-1')).flush({ id: 'cli-1', nome: 'Cliente 1', documento: '111' });
    controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1')).flush({ id: 'vei-1', modelo: 'Gol', placa: 'ABC1234' });
    fixture.detectChanges();

    component.observacaoEditada = 'Correia dentada substituída';
    component.salvarObservacao();

    const patchReq = controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-11112222'));
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ observacao: 'Correia dentada substituída' });
    patchReq.flush({
      id: 'os-11112222',
      status: 'Recebida',
      observacao: 'Correia dentada substituída',
    });
    fixture.detectChanges();

    expect(component.os()?.observacao).toBe('Correia dentada substituída');
    expect(component.observacaoSalva()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Observação salva com sucesso.');
  });

  it('mostra alerta quando a OS não é encontrada (404)', () => {
    fixture = TestBed.createComponent(OsDetalhePageComponent);
    fixture.componentRef.setInput('id', 'os-404');
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller
      .expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-404'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    controller
      .expectOne(req => req.url === API_ENDPOINTS.EXECUCAO.FILA)
      .flush({ itens: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar a OS.'
    );
  });

  it('exibe fallback com IDs quando busca de cliente ou veículo falha', () => {
    fixture = TestBed.createComponent(OsDetalhePageComponent);
    fixture.componentRef.setInput('id', 'os-fail-info');
    component = fixture.componentInstance;
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.ORDENS_SERVICO.BY_ID('os-fail-info')).flush({
      id: 'os-fail-info',
      clienteId: 'cli-fail-1234',
      veiculoId: 'vei-fail-5678',
      status: 'Recebida',
      historico: [],
    });
    controller
      .expectOne(req => req.url === API_ENDPOINTS.EXECUCAO.FILA)
      .flush({ itens: [] });
    controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID('os-fail-info')).flush(null, { status: 404, statusText: 'Not Found' });
    controller.expectOne(API_ENDPOINTS.CLIENTES.BY_ID('cli-fail-1234')).flush(null, { status: 500, statusText: 'Error' });
    controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-fail-5678')).flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('cli-fail');
    expect(texto).toContain('vei-fail');
  });
});
