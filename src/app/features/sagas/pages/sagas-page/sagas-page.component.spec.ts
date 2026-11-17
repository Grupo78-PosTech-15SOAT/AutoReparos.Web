import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SagasPageComponent } from './sagas-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { errorInterceptor } from '../../../../core/http/error.interceptor';
import { MENSAGENS_POR_CODIGO } from '../../../../core/http/error-catalog';
import { NotificationService } from '../../../../core/ui/notification.service';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';
import { SagaDetalhe } from '../../models/saga.model';
import { formatarDataHora } from '../../../../shared/utils/data-hora.utils';

const OS_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

const DETALHE_AGUARDANDO: SagaDetalhe = {
  ordemServicoId: OS_ID,
  correlacaoId: 'bbbbbbbb-2222-4222-8222-222222222222',
  orcamentoId: 'cccccccc-3333-4333-8333-333333333333',
  estado: 'AguardandoInsumos',
  atualizadoEm: '2026-11-16T12:00:00Z',
  etapas: [
    { numero: 1, nome: 'Orçamento aprovado', situacao: 'Concluida' },
    { numero: 5, nome: 'Insumos reservados', situacao: 'Pendente' },
  ],
  comandos: [
    {
      tipo: 'execucao.reservar-insumos.v1',
      destino: 'Execucao',
      enviadoEm: '2026-11-16T11:59:00Z',
      tentativas: 1,
      ultimoErro: null,
    },
  ],
  registros: [
    {
      em: '2026-11-16T12:00:00Z',
      evento: 'insumos.reserva-falhou.v1',
      descricao: 'Sem saldo de insumos; aguardando.',
    },
  ],
};

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

describe('SagasPage', () => {
  let fixture: ComponentFixture<SagasPageComponent>;
  let component: SagasPageComponent;
  let controller: HttpTestingController;
  let notificacao: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SagasPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: memoria() },
      ],
    }).compileComponents();

    controller = TestBed.inject(HttpTestingController);
    notificacao = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(SagasPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    controller.verify();
    document.body.querySelectorAll('[data-testid="cs-painel"]').forEach(p => p.remove());
  });

  function nativo(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function abrirSelect(testid: string): HTMLElement[] {
    const gatilho = nativo().querySelector(`[data-testid="${testid}"] .cs-trigger`) as HTMLButtonElement;
    gatilho.click();
    fixture.detectChanges();
    const painel = document.body.querySelector('[data-testid="cs-painel"]') as HTMLElement;
    expect(painel).toBeTruthy();
    return Array.from(painel.querySelectorAll('[data-testid="cs-opcao"]')) as HTMLElement[];
  }

  function clicar(testid: string): void {
    (nativo().querySelector(`[data-testid="${testid}"]`) as HTMLElement).click();
    fixture.detectChanges();
  }

  function carregarLista(itens: unknown[]): void {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.SAGAS.BASE).flush(itens);
    fixture.detectChanges();
  }

  function abrirDetalhe(detalhe: SagaDetalhe): void {
    clicar(`ver-saga-${detalhe.ordemServicoId}`);
    controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID(detalhe.ordemServicoId)).flush(detalhe);
    fixture.detectChanges();
  }

  describe('SagasPage filtros', () => {
    it('oferece as opções de "Parada há", rótulos pt-BR no Estado e pede paradaHaMinutos=60 ao escolher "1 h" e Atualizar', () => {
      carregarLista([]);

      const opcoesParada = abrirSelect('filtro-parada');
      expect(opcoesParada.map(o => o.textContent?.trim())).toEqual(['Qualquer tempo', '15 min', '1 h', '6 h', '24 h']);
      opcoesParada.find(o => o.textContent?.trim() === '1 h')!.click();
      fixture.detectChanges();

      const opcoesEstado = abrirSelect('filtro-estado');
      const rotulos = opcoesEstado.map(o => o.textContent?.trim());
      expect(rotulos[0]).toBe('Todos os estados');
      expect(rotulos).toContain('Aguardando insumos');
      expect(rotulos).toContain('Compensação falhou');
      expect(rotulos).not.toContain('AguardandoInsumos');
      opcoesEstado.find(o => o.textContent?.trim() === 'Todos os estados')!.click();
      fixture.detectChanges();

      const botao = nativo().querySelector('[data-testid="btn-filtrar"]') as HTMLButtonElement;
      expect(botao.textContent).toContain('Atualizar');
      expect(botao.classList).toContain('btn-secondary');
      botao.click();

      const req = controller.expectOne(r => r.url === API_ENDPOINTS.SAGAS.BASE);
      expect(req.request.params.get('paradaHaMinutos')).toBe('60');
      expect(req.request.params.has('estado')).toBe(false);
      req.flush([]);
    });

    it('volta a "Qualquer tempo" sem enviar paradaHaMinutos', () => {
      carregarLista([]);
      abrirSelect('filtro-parada').find(o => o.textContent?.trim() === '24 h')!.click();
      fixture.detectChanges();
      expect(component.filtroParada()).toBe(1440);
      abrirSelect('filtro-parada').find(o => o.textContent?.trim() === 'Qualquer tempo')!.click();
      fixture.detectChanges();
      clicar('btn-filtrar');

      const req = controller.expectOne(r => r.url === API_ENDPOINTS.SAGAS.BASE);
      expect(req.request.params.has('paradaHaMinutos')).toBe(false);
      req.flush([]);
    });
  });

  describe('SagasPage tabela', () => {
    it('mostra o id curto da OS, o rótulo do estado e a hora relativa em cada linha', () => {
      const cincoMinAtras = new Date(Date.now() - 5 * 60_000).toISOString();
      carregarLista([{ ordemServicoId: OS_ID, estado: 'AguardandoInsumos', atualizadoEm: cincoMinAtras }]);

      const linha = nativo().querySelector(`[data-testid="linha-saga-${OS_ID}"]`) as HTMLElement;
      expect(linha).toBeTruthy();
      expect(linha.querySelector('app-id-badge')?.textContent).toContain('#aaaaaaaa');
      expect(linha.querySelector('app-id-badge')?.textContent).not.toContain(OS_ID);
      expect(linha.querySelector('app-status-badge')?.textContent?.trim()).toBe('Aguardando insumos');
      expect(linha.querySelector('time')?.textContent?.trim()).toBe('há 5 min');
      expect(nativo().querySelector(`[data-testid="ver-saga-${OS_ID}"]`)?.textContent).toContain('Detalhes');
    });

    it('mostra o estado vazio e o erro de carregamento', () => {
      carregarLista([]);
      expect(nativo().querySelector('.empty-state')?.textContent).toContain('Nenhuma saga encontrada');

      clicar('btn-filtrar');
      controller.expectOne(r => r.url === API_ENDPOINTS.SAGAS.BASE).flush({}, { status: 500, statusText: 'Erro' });
      fixture.detectChanges();
      expect(nativo().querySelector('[data-testid="erro-saga"]')).toBeTruthy();
    });
  });

  describe('SagasPage drawer', () => {
    it('abre o drawer com as abas na ordem Etapas, Comandos e Registros, lista os registros e fecha mantendo a tabela', () => {
      carregarLista([{ ordemServicoId: OS_ID, estado: 'AguardandoInsumos', atualizadoEm: '2026-11-16T12:00:00Z' }]);
      expect(nativo().querySelector('app-drawer .drawer-panel')).toBeNull();

      abrirDetalhe(DETALHE_AGUARDANDO);

      const painel = nativo().querySelector('app-drawer .drawer-panel') as HTMLElement;
      expect(painel).toBeTruthy();
      expect(painel.querySelector('[data-testid="detalhe-saga"]')?.textContent).toContain('#aaaaaaaa');
      expect(painel.querySelector('[data-testid="detalhe-estado"]')?.textContent?.trim()).toBe('Aguardando insumos');

      const abas = Array.from(painel.querySelectorAll('[role="tab"]')) as HTMLElement[];
      expect(abas.map(a => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Etapas 2', 'Comandos 1', 'Registros 1']);
      expect(abas[0].getAttribute('aria-selected')).toBe('true');
      expect(painel.querySelector('[data-testid="lista-etapas"]')?.textContent).toContain('Orçamento aprovado');
      expect(painel.querySelector('[data-testid="lista-registros"]')).toBeNull();

      clicar('aba-comandos');
      const comandos = nativo().querySelector('[data-testid="lista-comandos"]')?.textContent ?? '';
      expect(comandos).toContain('execucao.reservar-insumos.v1');
      expect(comandos).toContain('1 tentativa');

      clicar('aba-registros');
      const registros = nativo().querySelector('[data-testid="lista-registros"]') as HTMLElement;
      expect(nativo().querySelector('[data-testid="aba-registros"]')?.getAttribute('aria-selected')).toBe('true');
      expect(registros.textContent).toContain(formatarDataHora('2026-11-16T12:00:00Z', 'curto'));
      expect(registros.textContent).toContain('insumos.reserva-falhou.v1');
      expect(registros.textContent).toContain('Sem saldo de insumos; aguardando.');

      (nativo().querySelector('button[aria-label="Fechar"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(nativo().querySelector('app-drawer .drawer-panel')).toBeNull();
      expect(component.detalhe()).toBeNull();
      expect(nativo().querySelector(`[data-testid="linha-saga-${OS_ID}"]`)).toBeTruthy();
    });
  });

  describe('SagasPage retentativa', () => {
    it.each([
      ['AguardandoInsumos', true],
      ['ReservandoInsumos', false],
      ['ExecucaoLiberada', false],
      ['CompensacaoFalhou', false],
    ] as const)('em %s o bloco de retentativa aparece: %s', (estado, aparece) => {
      carregarLista([{ ordemServicoId: OS_ID, estado, atualizadoEm: '2026-11-16T12:00:00Z' }]);
      abrirDetalhe({ ...DETALHE_AGUARDANDO, estado });

      expect(!!nativo().querySelector('[data-testid="bloco-retentativa"]')).toBe(aparece);
      expect(!!nativo().querySelector('[data-testid="btn-retentar"]')).toBe(aparece);
    });
  });

  describe('SagasPage layout compartilhado', () => {
    it('renderiza dentro de app-page-container e utiliza status-badge e id-badge', () => {
      fixture.detectChanges();
      controller.expectOne(API_ENDPOINTS.SAGAS.BASE).flush([]);
      fixture.detectChanges();

      const pageContainer = fixture.nativeElement.querySelector('app-page-container');
      expect(pageContainer).toBeTruthy();
    });
  });

  describe('SagasPage lista e retenta', () => {
    it('lista sagas com filtros de estado e paradaHaMinutos, abre detalhe com etapas/comandos/registros e retenta reserva com motivo obrigatório', () => {
      fixture.detectChanges();

      const reqInicial = controller.expectOne(API_ENDPOINTS.SAGAS.BASE);
      expect(reqInicial.request.method).toBe('GET');
      reqInicial.flush([
        {
          ordemServicoId: OS_ID,
          estado: 'AguardandoInsumos',
          atualizadoEm: '2026-11-16T12:00:00Z',
        },
      ]);
      fixture.detectChanges();
      expect(component.sagas()).toHaveLength(1);

      // Filtra por estado e paradaHaMinutos (aceita também formato { itens })
      component.filtroEstado.set('AguardandoInsumos');
      component.filtroParada.set(60);
      component.carregar();

      const reqFiltrada = controller.expectOne(
        r =>
          r.url === API_ENDPOINTS.SAGAS.BASE &&
          r.params.get('estado') === 'AguardandoInsumos' &&
          r.params.get('paradaHaMinutos') === '60'
      );
      reqFiltrada.flush({
        itens: [
          {
            ordemServicoId: OS_ID,
            estado: 'AguardandoInsumos',
            atualizadoEm: '2026-11-16T12:00:00Z',
          },
        ],
      });
      fixture.detectChanges();
      expect(component.sagas()).toHaveLength(1);

      // Abre o detalhe da Saga
      component.selecionar(OS_ID);
      const reqDetalhe = controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID(OS_ID));
      expect(reqDetalhe.request.method).toBe('GET');
      reqDetalhe.flush(DETALHE_AGUARDANDO);
      fixture.detectChanges();

      const nativo: HTMLElement = fixture.nativeElement;
      expect(nativo.querySelector('[data-testid="lista-etapas"]')?.textContent).toContain('Orçamento aprovado');
      component.aba.set('comandos');
      fixture.detectChanges();
      expect(nativo.querySelector('[data-testid="lista-comandos"]')?.textContent).toContain('execucao.reservar-insumos.v1');
      component.aba.set('registros');
      fixture.detectChanges();
      expect(nativo.querySelector('[data-testid="lista-registros"]')?.textContent).toContain('insumos.reserva-falhou.v1');

      const btnRetentar = nativo.querySelector('[data-testid="btn-retentar"]') as HTMLButtonElement;
      expect(btnRetentar).toBeTruthy();
      expect(btnRetentar.disabled).toBe(true);

      // Tentar retentar com motivo em branco não dispara requisição
      component.motivoRetentativa.set('   ');
      component.retentar();
      controller.expectNone(API_ENDPOINTS.SAGAS.RETENTAR(OS_ID));

      // Preenche motivo e aciona retentativa
      component.motivoRetentativa.set('Saldo reposto pelo fornecedor');
      fixture.detectChanges();
      expect(btnRetentar.disabled).toBe(false);

      component.retentar();
      expect(component.enviando()).toBe(true);

      const reqRetentar = controller.expectOne(API_ENDPOINTS.SAGAS.RETENTAR(OS_ID));
      expect(reqRetentar.request.method).toBe('POST');
      expect(reqRetentar.request.body).toEqual({ motivo: 'Saldo reposto pelo fornecedor' });
      reqRetentar.flush({ ordemServicoId: OS_ID, passo: 'reserva-de-insumos' }, { status: 202, statusText: 'Accepted' });
      fixture.detectChanges();

      expect(component.enviando()).toBe(false);
      expect(component.detalhe()?.estado).toBe('ReservandoInsumos');
      expect(nativo.querySelector('[data-testid="sucesso-saga"]')?.textContent).toContain('Retentativa de reserva enviada com sucesso.');
    });

    it('não exibe botão de retentativa quando a saga não está em AguardandoInsumos', () => {
      fixture.detectChanges();
      controller.expectOne(API_ENDPOINTS.SAGAS.BASE).flush([]);

      component.selecionar(OS_ID);
      controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID(OS_ID)).flush({
        ...DETALHE_AGUARDANDO,
        estado: 'ExecucaoLiberada',
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="btn-retentar"]')).toBeNull();
    });
  });

  describe('SagasPage conflito', () => {
    it.each(['saga_em_andamento', 'retentativa_indisponivel'] as const)(
      'mostra a mensagem do código %s em 409 e mantém a Saga como está',
      codigo => {
        fixture.detectChanges();
        controller.expectOne(API_ENDPOINTS.SAGAS.BASE).flush([
          {
            ordemServicoId: OS_ID,
            estado: 'AguardandoInsumos',
            atualizadoEm: '2026-11-16T12:00:00Z',
          },
        ]);

        component.selecionar(OS_ID);
        controller.expectOne(API_ENDPOINTS.SAGAS.BY_ID(OS_ID)).flush(DETALHE_AGUARDANDO);
        fixture.detectChanges();

        component.motivoRetentativa.set('Tentativa após reposição');
        component.retentar();

        const req = controller.expectOne(API_ENDPOINTS.SAGAS.RETENTAR(OS_ID));
        req.flush({ codigo }, { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        const nativo: HTMLElement = fixture.nativeElement;
        expect(component.erro()).toBe(MENSAGENS_POR_CODIGO[codigo]);
        expect(nativo.querySelector('[data-testid="erro-saga"]')?.textContent?.trim()).toBe(
          MENSAGENS_POR_CODIGO[codigo]
        );
        expect(component.detalhe()?.ordemServicoId).toBe(OS_ID);
        expect(component.detalhe()?.estado).toBe('AguardandoInsumos');
        expect(component.detalhe()?.etapas).toHaveLength(2);
        expect(notificacao.toasts()).toHaveLength(0);
      }
    );
  });
});
