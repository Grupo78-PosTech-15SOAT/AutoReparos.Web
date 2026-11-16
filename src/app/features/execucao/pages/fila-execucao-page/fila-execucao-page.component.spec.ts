import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FilaExecucaoPageComponent } from './fila-execucao-page.component';
import { AuthService } from '../../../auth/services/auth.service';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { MENSAGENS_POR_CODIGO } from '../../../../core/http/error-catalog';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';

describe('FilaExecucaoPage', () => {
  let fixture: ComponentFixture<FilaExecucaoPageComponent>;
  let component: FilaExecucaoPageComponent;
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
      imports: [FilaExecucaoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
      ],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(FilaExecucaoPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('filtra por status e mecanicoId em GET /api/v1/fila-execucao e executa etapas (Diagnostico e Reparo), concluir, falha e reexecutar', () => {
    auth.currentUser.set({ email: 'admin@auto.com', role: 'Administrador' });
    fixture.detectChanges();

    const inicial = controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA);
    expect(inicial.request.method).toBe('GET');
    inicial.flush([{ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmAndamento', mecanicoId: 'mec-9' }]);
    fixture.detectChanges();

    component.filtroStatus = 'EmAndamento';
    component.filtroMecanicoId = 'mec-9';
    component.carregar();

    const filtrada = controller.expectOne(
      r =>
        r.url === API_ENDPOINTS.EXECUCAO.FILA &&
        r.params.get('status') === 'EmAndamento' &&
        r.params.get('mecanicoId') === 'mec-9'
    );
    expect(filtrada.request.method).toBe('GET');
    filtrada.flush({ itens: [{ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmAndamento', mecanicoId: 'mec-9' }] });

    // 1. Etapa Diagnostico
    component.registrarEtapa('exec-1', 'Diagnostico');
    const reqDiag = controller.expectOne(API_ENDPOINTS.EXECUCAO.ETAPAS('exec-1'));
    expect(reqDiag.request.method).toBe('POST');
    expect(reqDiag.request.body).toMatchObject({ etapa: 'Diagnostico', tipo: 'Diagnostico' });
    reqDiag.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmDiagnostico' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 2. Etapa Reparo
    component.registrarEtapa('exec-1', 'Reparo');
    const reqReparo = controller.expectOne(API_ENDPOINTS.EXECUCAO.ETAPAS('exec-1'));
    expect(reqReparo.request.method).toBe('POST');
    expect(reqReparo.request.body).toMatchObject({ etapa: 'Reparo', tipo: 'Reparo' });
    reqReparo.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmReparo' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 3. Concluir
    component.concluir('exec-1');
    const reqConclusao = controller.expectOne(API_ENDPOINTS.EXECUCAO.CONCLUSAO('exec-1'));
    expect(reqConclusao.request.method).toBe('POST');
    reqConclusao.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'Concluida' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 4. Marcar falha
    component.marcarFalha('exec-1', 'Peça incompatível');
    const reqFalha = controller.expectOne(API_ENDPOINTS.EXECUCAO.FALHA('exec-1'));
    expect(reqFalha.request.method).toBe('POST');
    expect(reqFalha.request.body).toEqual({ motivo: 'Peça incompatível' });
    reqFalha.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'Falha' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 5. Reexecutar (Administrador)
    component.reexecutar('exec-1', 'Peça substituída');
    const reqReexec = controller.expectOne(API_ENDPOINTS.EXECUCAO.REEXECUCAO('exec-1'));
    expect(reqReexec.request.method).toBe('POST');
    expect(reqReexec.request.body).toEqual({ motivo: 'Peça substituída' });
    reqReexec.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmAndamento' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);
  });

  it('mostra a mensagem do catálogo em 409 execucao_estado_invalido e oculta reexecutar para Mecânico', () => {
    auth.currentUser.set({ email: 'mec@auto.com', role: 'Mecanico' });
    fixture.detectChanges();

    controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush([
      { id: 'exec-2', ordemServicoId: 'os-2', status: 'Concluida' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="btn-reexecutar-execucao"]')).toBeNull();

    component.concluir('exec-2');
    controller
      .expectOne(API_ENDPOINTS.EXECUCAO.CONCLUSAO('exec-2'))
      .flush({ codigo: 'execucao_estado_invalido' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('[data-testid="erro-execucao"]').textContent as string;
    expect(alerta).toContain(MENSAGENS_POR_CODIGO['execucao_estado_invalido']);
  });
});
