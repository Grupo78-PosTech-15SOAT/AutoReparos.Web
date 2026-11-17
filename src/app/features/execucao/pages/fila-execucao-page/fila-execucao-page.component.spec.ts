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
import { formatarDataHora } from '../../../../shared/utils/data-hora.utils';

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

  afterEach(() => {
    controller.verify();
    document.body.querySelectorAll('[data-testid="cs-painel"]').forEach(p => p.remove());
  });

  const OS_A = 'aaaaaaaa-1111-4111-8111-111111111111';
  const OS_B = 'bbbbbbbb-2222-4222-8222-222222222222';

  function carregarFila(itens: unknown[], papel = 'Administrador'): HTMLElement {
    auth.currentUser.set({ email: 'u@auto.com', role: papel });
    fixture.detectChanges();
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush(itens);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function existe(raiz: ParentNode, testid: string): boolean {
    return !!raiz.querySelector(`[data-testid="${testid}"]`);
  }

  describe('FilaExecucao veiculo', () => {
    it('mostra placa e modelo quando o veículo resolve e o id curto da OS quando a consulta falha', () => {
      const nativo = carregarFila([
        { id: 'exec-1', ordemServicoId: OS_A, veiculoId: 'vei-1', status: 'Fila' },
        { id: 'exec-2', ordemServicoId: OS_B, veiculoId: 'vei-2', status: 'EmExecucao' },
      ]);

      controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-1')).flush({
        id: 'vei-1', placa: 'ABC1D23', modelo: 'Gol', marca: 'Volkswagen', anoFabricacao: 2020, anoModelo: 2021, clienteId: 'c-1',
      });
      controller.expectOne(API_ENDPOINTS.VEICULOS.BY_ID('vei-2')).flush({}, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      const [card1, card2] = Array.from(nativo.querySelectorAll('[data-testid="item-fila-execucao"]')) as HTMLElement[];
      const identidade1 = card1.querySelector('[data-testid="identidade-execucao"]') as HTMLElement;
      expect(identidade1.querySelector('app-placa-badge')?.textContent?.trim()).toBe('ABC-1D23');
      expect(identidade1.textContent).toContain('Gol');
      expect(identidade1.textContent).toContain('Volkswagen');
      expect(card1.textContent).toContain('#aaaaaaaa');

      const identidade2 = card2.querySelector('[data-testid="identidade-execucao"]') as HTMLElement;
      expect(identidade2.querySelector('app-placa-badge')).toBeNull();
      expect(identidade2.querySelector('app-id-badge')?.textContent).toContain('#bbbbbbbb');
      expect(card2.querySelector('app-status-badge')?.textContent?.trim()).toBe('Em Execução');
    });

    it('não consulta veículo quando a execução não traz veiculoId', () => {
      const nativo = carregarFila([{ id: 'exec-1', ordemServicoId: OS_A, status: 'Fila' }]);
      controller.expectNone(r => r.url.includes('/veiculos/'));
      expect(nativo.querySelector('[data-testid="identidade-execucao"]')?.textContent).toContain('#aaaaaaaa');
    });
  });

  describe('FilaExecucao acoes por estado', () => {
    it.each([
      { status: 'Fila', papel: 'Administrador', etapas: true, concluir: false, falha: true, reexecutar: false },
      { status: 'EmExecucao', papel: 'Mecanico', etapas: true, concluir: true, falha: true, reexecutar: false },
      { status: 'Falhou', papel: 'Administrador', etapas: false, concluir: false, falha: false, reexecutar: true },
      { status: 'Falhou', papel: 'Mecanico', etapas: false, concluir: false, falha: false, reexecutar: false },
      { status: 'Concluida', papel: 'Administrador', etapas: false, concluir: false, falha: false, reexecutar: false },
      { status: 'Cancelada', papel: 'Administrador', etapas: false, concluir: false, falha: false, reexecutar: false },
    ])('$status ($papel): etapas=$etapas concluir=$concluir falha=$falha reexecutar=$reexecutar', c => {
      const nativo = carregarFila([{ id: 'exec-1', ordemServicoId: OS_A, status: c.status }], c.papel);
      const card = nativo.querySelector('[data-testid="item-fila-execucao"]') as HTMLElement;

      expect(existe(card, 'btn-etapa-diagnostico')).toBe(c.etapas);
      expect(existe(card, 'btn-etapa-reparo')).toBe(c.etapas);
      expect(existe(card, 'hint-auto-descricao')).toBe(c.etapas);
      expect(existe(card, 'btn-concluir-execucao')).toBe(c.concluir);
      expect(existe(card, 'btn-reportar-falha')).toBe(c.falha);
      expect(existe(card, 'btn-reexecutar-execucao')).toBe(c.reexecutar);
      if (c.etapas) {
        expect(card.querySelector('[data-testid="btn-etapa-diagnostico"]')?.textContent?.trim()).toBe('Registrar diagnóstico');
        expect(card.querySelector('[data-testid="btn-etapa-reparo"]')?.textContent?.trim()).toBe('Registrar reparo');
      }
    });
  });

  describe('FilaExecucao falha e etapas', () => {
    it('"Reportar falha" mostra o motivo e "Confirmar falha", desabilitado com motivo vazio, e envia a falha', async () => {
      const nativo = carregarFila([{ id: 'exec-1', ordemServicoId: OS_A, status: 'EmExecucao' }]);
      expect(existe(nativo, 'motivo-falha-input')).toBe(false);
      expect(existe(nativo, 'btn-falha-execucao')).toBe(false);

      (nativo.querySelector('[data-testid="btn-reportar-falha"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const motivo = nativo.querySelector('[data-testid="motivo-falha-input"]') as HTMLInputElement;
      const confirmar = nativo.querySelector('[data-testid="btn-falha-execucao"]') as HTMLButtonElement;
      expect(motivo).toBeTruthy();
      expect(confirmar.textContent?.trim()).toBe('Confirmar falha');
      expect(confirmar.disabled).toBe(true);
      expect(existe(nativo, 'btn-reportar-falha')).toBe(false);

      motivo.value = '   ';
      motivo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(confirmar.disabled).toBe(true);

      motivo.value = 'Peça incompatível';
      motivo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(confirmar.disabled).toBe(false);

      confirmar.click();
      const req = controller.expectOne(API_ENDPOINTS.EXECUCAO.FALHA('exec-1'));
      expect(req.request.body).toEqual({ motivo: 'Peça incompatível' });
      req.flush({ id: 'exec-1', ordemServicoId: OS_A, status: 'Falhou' });
      controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);
      expect(component.falhaAberta()).toBeNull();
    });

    it('"Cancelar" esconde o campo de motivo', () => {
      const nativo = carregarFila([{ id: 'exec-1', ordemServicoId: OS_A, status: 'Fila' }]);
      (nativo.querySelector('[data-testid="btn-reportar-falha"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      (nativo.querySelector('[data-testid="btn-cancelar-falha"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(existe(nativo, 'motivo-falha-input')).toBe(false);
      expect(existe(nativo, 'btn-reportar-falha')).toBe(true);
    });

    it('cada etapa mostra o tipo, a descrição, o responsável e registradaEm formatado', () => {
      const em1 = '2026-11-16T13:05:00Z';
      const em2 = '2026-11-16T14:32:00Z';
      const nativo = carregarFila([
        {
          id: 'exec-1', ordemServicoId: OS_A, status: 'EmExecucao',
          etapas: [
            { sequencia: 1, tipo: 'Diagnostico', descricao: 'Diagnóstico técnico realizado', responsavel: 'Carlos', registradaEm: em1 },
            { sequencia: 2, tipo: 'Reparo', descricao: 'Troca da bobina', responsavel: 'Ana', registradaEm: em2 },
          ],
        },
      ]);

      const etapas = Array.from(nativo.querySelectorAll('[data-testid="etapa-execucao"]')) as HTMLElement[];
      expect(etapas).toHaveLength(2);
      expect(etapas[0].querySelector('[data-testid="etapa-tipo"]')?.textContent?.trim()).toBe('Diagnóstico');
      expect(etapas[0].textContent).toContain('Diagnóstico técnico realizado');
      expect(etapas[0].querySelector('[data-testid="badge-descricao-automatica"]')).toBeTruthy();
      expect(etapas[0].textContent).toContain('por Carlos');
      expect(etapas[0].querySelector('time')?.textContent?.trim()).toBe(formatarDataHora(em1, 'curto'));
      expect(etapas[1].querySelector('[data-testid="etapa-tipo"]')?.textContent?.trim()).toBe('Reparo');
      expect(etapas[1].textContent).toContain('Troca da bobina');
      expect(etapas[1].querySelector('[data-testid="badge-descricao-automatica"]')).toBeNull();
      expect(etapas[1].textContent).toContain('por Ana');
      expect(etapas[1].querySelector('time')?.textContent?.trim()).toBe(formatarDataHora(em2, 'curto'));
    });
  });

  describe('FilaExecucaoPage descricao etapa', () => {
    it('envia { tipo, descricao } preenchida ou fallback automático e indica na UI', () => {
      auth.currentUser.set({ email: 'admin@auto.com', role: 'Administrador' });
      fixture.detectChanges();

      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush([
        { id: 'exec-1', ordemServicoId: 'os-1', status: 'EmExecucao' }
      ]);
      fixture.detectChanges();

      // Sem preencher descrição -> usa fallback padrão e mostra dica na tela
      const hint = fixture.nativeElement.querySelector('[data-testid="hint-auto-descricao"]');
      expect(hint).toBeTruthy();

      component.registrarEtapa('exec-1', 'Diagnostico');
      const reqDiag = controller.expectOne(API_ENDPOINTS.EXECUCAO.ETAPAS('exec-1'));
      expect(reqDiag.request.method).toBe('POST');
      expect(reqDiag.request.body.tipo).toBe('Diagnostico');
      expect(reqDiag.request.body.descricao).toBe('Diagnóstico técnico realizado');
      reqDiag.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmExecucao' });
      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush([]);
      fixture.detectChanges();

      // Com descrição personalizada
      component.descricoes['exec-1'] = 'Checagem de bobina';
      component.registrarEtapa('exec-1', 'Reparo');
      const reqRep = controller.expectOne(API_ENDPOINTS.EXECUCAO.ETAPAS('exec-1'));
      expect(reqRep.request.body.tipo).toBe('Reparo');
      expect(reqRep.request.body.descricao).toBe('Checagem de bobina');
      reqRep.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmExecucao' });
      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush([]);
    });
  });

  describe('FilaExecucaoPage filtros', () => {
    it('filtra por status e ?mecanico= e exibe histórico de etapas, motivo de falha e intervenção requerida', () => {
      auth.currentUser.set({ email: 'admin@auto.com', role: 'Administrador' });
      fixture.detectChanges();
      controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA).flush([]);

      component.filtroStatus = 'EmExecucao';
      component.filtroMecanico = 'Carlos';
      component.carregar();

      const reqFiltrada = controller.expectOne(
        r => r.url === API_ENDPOINTS.EXECUCAO.FILA &&
             r.params.get('status') === 'EmExecucao' &&
             r.params.get('mecanico') === 'Carlos'
      );
      reqFiltrada.flush([
        {
          id: 'exec-88',
          ordemServicoId: 'os-99',
          status: 'Falhou',
          intervencaoRequerida: true,
          motivoFalha: 'Insumo indisponível',
          etapas: [
            { sequencia: 1, tipo: 'Diagnostico', descricao: 'Diagnóstico técnico realizado', responsavel: 'Carlos' },
            { sequencia: 2, tipo: 'Reparo', descricao: 'Scanner acusou falha', responsavel: 'Carlos' }
          ]
        }
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="badge-intervencao"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="motivo-falha"]').textContent).toContain('Insumo indisponível');
      expect(fixture.nativeElement.querySelector('[data-testid="historico-etapas"]').textContent).toContain('Scanner acusou falha');
      const badgeAuto = fixture.nativeElement.querySelector('[data-testid="badge-descricao-automatica"]');
      expect(badgeAuto).toBeTruthy();
      expect(badgeAuto.textContent).toContain('(descrição automática)');
    });
  });

  it('executa etapas, concluir, falha e reexecutar', () => {
    auth.currentUser.set({ email: 'admin@auto.com', role: 'Administrador' });
    fixture.detectChanges();

    const inicial = controller.expectOne(API_ENDPOINTS.EXECUCAO.FILA);
    expect(inicial.request.method).toBe('GET');
    inicial.flush([{ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmExecucao' }]);
    fixture.detectChanges();

    // 1. Etapa Diagnostico
    component.registrarEtapa('exec-1', 'Diagnostico');
    const reqDiag = controller.expectOne(API_ENDPOINTS.EXECUCAO.ETAPAS('exec-1'));
    expect(reqDiag.request.method).toBe('POST');
    expect(reqDiag.request.body).toMatchObject({ tipo: 'Diagnostico' });
    reqDiag.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmDiagnostico' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 2. Concluir
    component.concluir('exec-1');
    const reqConclusao = controller.expectOne(API_ENDPOINTS.EXECUCAO.CONCLUSAO('exec-1'));
    expect(reqConclusao.request.method).toBe('POST');
    reqConclusao.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'Concluida' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 3. Marcar falha
    component.marcarFalha('exec-1', 'Peça incompatível');
    const reqFalha = controller.expectOne(API_ENDPOINTS.EXECUCAO.FALHA('exec-1'));
    expect(reqFalha.request.method).toBe('POST');
    expect(reqFalha.request.body).toEqual({ motivo: 'Peça incompatível' });
    reqFalha.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'Falha' });
    controller.expectOne(r => r.url === API_ENDPOINTS.EXECUCAO.FILA).flush([]);

    // 4. Reexecutar (Administrador)
    component.reexecutar('exec-1', 'Peça substituída');
    const reqReexec = controller.expectOne(API_ENDPOINTS.EXECUCAO.REEXECUCAO('exec-1'));
    expect(reqReexec.request.method).toBe('POST');
    expect(reqReexec.request.body).toEqual({ motivo: 'Peça substituída' });
    reqReexec.flush({ id: 'exec-1', ordemServicoId: 'os-1', status: 'EmExecucao' });
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
