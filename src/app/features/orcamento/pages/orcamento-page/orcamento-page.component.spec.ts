import { describe, it, expect, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { MENSAGEM_OS_NAO_ENCONTRADA, OrcamentoPageComponent } from './orcamento-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';
import { OsConhecidasService, OsEnriquecida } from '../../../ordens-servico/services/os-conhecidas.service';
import { idCurto } from '../../../../shared/components/id-badge/id-badge.component';

function os(id: string, extra: Partial<OsEnriquecida>): OsEnriquecida {
  return { id, codigo: idCurto(id), status: 'Recebida', ...extra };
}

const OS_EXECUCAO = os('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
  status: 'EmExecucao',
  clienteId: 'cli-joao',
  veiculoId: 'vei-uno',
  placa: 'XYZ9K88',
  modelo: 'Uno',
  marca: 'Fiat',
  clienteNome: 'João Souza',
  clienteDocumento: '98765432100',
});

const OS_RECEBIDA = os('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
  status: 'Recebida',
  clienteId: 'cli-maria',
  veiculoId: 'vei-gol',
  placa: 'ABC1D23',
  modelo: 'Gol',
  marca: 'VW',
  clienteNome: 'Maria Silva',
  clienteDocumento: '12345678901',
});

const OS_FORA_DA_LISTA = os('33333333-cccc-4ccc-8ccc-cccccccccccc', {
  status: 'Recebida',
  clienteId: 'cli-carlos',
  veiculoId: 'vei-onix',
  placa: 'DEF4G56',
  modelo: 'Onix',
  marca: 'Chevrolet',
  clienteNome: 'Carlos Lima',
});

const UUID_INEXISTENTE = '44444444-dddd-4ddd-8ddd-dddddddddddd';

interface Montagem {
  params?: Record<string, string>;
  query?: Record<string, string>;
  lista?: OsEnriquecida[];
  resolver?: (id: string) => Observable<OsEnriquecida | null>;
  carregar?: () => Observable<OsEnriquecida[]>;
  jornada?: { osId: string; clienteId?: string }[];
}

describe('OrcamentoPage', () => {
  let fixture: ComponentFixture<OrcamentoPageComponent>;
  let component: OrcamentoPageComponent;
  let controller: HttpTestingController;
  let resolver: ReturnType<typeof vi.fn>;

  function montar(cfg: Montagem = {}): void {
    const memoria = new Map<string, string>();
    const storage: Storage = {
      get length() { return memoria.size; },
      clear: () => memoria.clear(),
      getItem: (k: string) => memoria.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { memoria.delete(k); },
      setItem: (k: string, v: string) => { memoria.set(k, v); },
    };
    const lista = cfg.lista ?? [OS_EXECUCAO, OS_RECEBIDA];
    resolver = vi.fn(
      cfg.resolver ?? ((id: string) => of(id === OS_FORA_DA_LISTA.id ? OS_FORA_DA_LISTA : null))
    );

    TestBed.configureTestingModule({
      imports: [OrcamentoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
        {
          provide: OsConhecidasService,
          useValue: { carregar: cfg.carregar ?? (() => of(lista)), resolver },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(cfg.params ?? {}),
              queryParamMap: convertToParamMap(cfg.query ?? {}),
            },
          },
        },
      ],
    });

    const store = TestBed.inject(OsJornadaStore);
    for (const registro of cfg.jornada ?? []) store.salvar(registro);

    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrcamentoPageComponent);
    component = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  }

  function responderCatalogos(): void {
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush([{ id: 'srv-1', nome: 'Troca de Óleo', precoBase: 100 }]);
    controller
      .expectOne(API_ENDPOINTS.INSUMOS.BASE)
      .flush([{ id: 'ins-1', nome: 'Filtro', precoUnitario: 1234.5, quantidadeDisponivel: 10 }]);
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function painel(): HTMLElement | null {
    return document.body.querySelector('[data-testid="cs-painel"]');
  }

  function abrirSeletor(): void {
    (el().querySelector('[data-testid="seletor-os"] .cs-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function digitar(texto: string): void {
    const input = painel()!.querySelector('[data-testid="cs-busca"]') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function opcoes(): HTMLElement[] {
    return Array.from(painel()?.querySelectorAll('[data-testid="cs-opcao"]') ?? []) as HTMLElement[];
  }

  function rotulos(): string[] {
    return opcoes().map(o => o.querySelector('.cs-option-label')!.textContent!.trim());
  }

  function escolher(trecho: string): void {
    const alvo = opcoes().find(o => o.querySelector('.cs-option-label')!.textContent!.includes(trecho));
    expect(alvo, `opção com "${trecho}"`).toBeTruthy();
    alvo!.click();
    fixture.detectChanges();
  }

  function texto(seletor: string): string {
    return (el().querySelector(seletor)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function clicarEnviar(): void {
    const botao = el().querySelector('[data-testid="btn-enviar-orcamento"]') as HTMLButtonElement;
    expect(botao.disabled).toBe(false);
    botao.click();
    fixture.detectChanges();
  }

  afterEach(() => {
    controller.verify();
    fixture?.destroy();
    fixture?.nativeElement.remove();
    document.body.querySelectorAll('[data-testid="cs-painel"]').forEach(p => p.remove());
  });

  describe('OrcamentoPage seletor OS', () => {
    it('lista as OS com código, placa e modelo no rótulo, cliente e estado na descrição, Recebida primeiro', () => {
      montar();
      responderCatalogos();
      abrirSeletor();

      expect(rotulos()).toEqual([
        `${idCurto(OS_RECEBIDA.id)} · ABC-1D23 · Gol`,
        `${idCurto(OS_EXECUCAO.id)} · XYZ-9K88 · Uno`,
      ]);
      const descricoes = opcoes().map(o => o.querySelector('.cs-option-descricao')!.textContent!.trim());
      expect(descricoes[0]).toBe('Maria Silva · Recebida');
      expect(descricoes[1]).toContain('João Souza');
      expect(descricoes[1]).not.toContain('EmExecucao');
      expect(painel()!.querySelector('[data-testid="cs-busca"]')!.getAttribute('placeholder')).toBe(
        'Código, placa, modelo ou cliente'
      );
    });

    it('filtra pela placa sem máscara e pelo modelo', () => {
      montar();
      responderCatalogos();
      abrirSeletor();

      digitar('abc1d23');
      expect(rotulos()).toEqual([`${idCurto(OS_RECEBIDA.id)} · ABC-1D23 · Gol`]);

      digitar('uno');
      expect(rotulos()).toEqual([`${idCurto(OS_EXECUCAO.id)} · XYZ-9K88 · Uno`]);
    });

    it('mostra o seletor carregando enquanto as OS não chegam', () => {
      montar({ carregar: () => new Observable<OsEnriquecida[]>(() => undefined) });
      responderCatalogos();
      expect(component.carregandoOs()).toBe(true);
      const gatilho = el().querySelector('[data-testid="seletor-os"] .cs-trigger') as HTMLButtonElement;
      expect(gatilho.disabled).toBe(true);
      expect(gatilho.textContent).toContain('Carregando');
    });
  });

  describe('OrcamentoPage UUID colado', () => {
    it('oferece "Usar OS #xxxxxxxx" para um UUID fora da lista, carrega e seleciona a OS', () => {
      montar();
      responderCatalogos();
      abrirSeletor();

      digitar(`  ${OS_FORA_DA_LISTA.id}  `);
      expect(rotulos()).toEqual(['Usar OS #33333333']);

      escolher('Usar OS #33333333');

      expect(resolver).toHaveBeenCalledWith(OS_FORA_DA_LISTA.id);
      expect(component.ordemServicoId()).toBe(OS_FORA_DA_LISTA.id);
      expect(component.clienteId()).toBe('cli-carlos');
      expect(texto('[data-testid="seletor-os"] .cs-trigger')).toBe(`${idCurto(OS_FORA_DA_LISTA.id)} · DEF-4G56 · Onix`);
      expect(texto('[data-testid="resumo-os"]')).toContain('Carlos Lima');
      expect(el().querySelector('[data-testid="erro-os"]')).toBeNull();
    });

    it('não oferece a opção sintética para UUID que já está na lista', () => {
      montar();
      responderCatalogos();
      abrirSeletor();

      digitar(OS_RECEBIDA.id);
      expect(rotulos()).toEqual([`${idCurto(OS_RECEBIDA.id)} · ABC-1D23 · Gol`]);
    });

    it('mostra "OS não encontrada para o código informado." quando a OS colada não existe', () => {
      montar();
      responderCatalogos();
      abrirSeletor();

      digitar(UUID_INEXISTENTE);
      escolher('Usar OS #44444444');

      expect(resolver).toHaveBeenCalledWith(UUID_INEXISTENTE);
      expect(texto('[data-testid="erro-os"]')).toBe(MENSAGEM_OS_NAO_ENCONTRADA);
      expect(MENSAGEM_OS_NAO_ENCONTRADA).toBe('OS não encontrada para o código informado.');
      expect(component.ordemServicoId()).toBe('');
      expect(el().querySelector('[data-testid="resumo-os"]')).toBeNull();
      expect((el().querySelector('[data-testid="btn-enviar-orcamento"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('mostra a mesma mensagem quando a consulta da OS falha', () => {
      montar({ resolver: () => throwError(() => new Error('falha')) });
      responderCatalogos();
      abrirSeletor();

      digitar(UUID_INEXISTENTE);
      escolher('Usar OS #44444444');

      expect(texto('[data-testid="erro-os"]')).toBe(MENSAGEM_OS_NAO_ENCONTRADA);
    });
  });

  describe('OrcamentoPage cliente da OS', () => {
    it('preenche o cliente da OS escolhida, mostra nome, placa e modelo e envia esse clienteId', () => {
      montar();
      responderCatalogos();
      abrirSeletor();
      digitar('abc1d23');
      escolher('ABC-1D23');

      const resumo = texto('[data-testid="resumo-os"]');
      expect(resumo).toContain('Maria Silva');
      expect(resumo).toContain('123.456.789-01');
      expect(resumo).toContain('ABC-1D23');
      expect(resumo).toContain('Gol');
      expect(el().querySelector('[data-testid="resumo-os"] app-documento-badge')).not.toBeNull();
      expect(el().querySelector('[data-testid="resumo-os"] app-placa-badge')).not.toBeNull();
      expect(el().querySelector('#orc-os-id')).toBeNull();
      expect(el().querySelector('#orc-cliente-id')).toBeNull();

      (el().querySelectorAll('[data-testid="catalogo-insumo"] button')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(texto('[data-testid="total-orcamento"]')).toBe('Total calculado: R$ 1.234,50');
      expect(texto('[data-testid="catalogo-insumo"]')).toContain('R$ 1.234,50');
      expect(texto('[data-testid="subtotal-item"]')).toBe('R$ 1.234,50');

      clicarEnviar();

      const post = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({
        ordemServicoId: OS_RECEBIDA.id,
        clienteId: 'cli-maria',
        valor: 0,
        itens: [
          { tipo: 'Insumo', referenciaId: 'ins-1', nome: 'Filtro', quantidade: 1, precoUnitario: 1234.5, subtotal: 1234.5 },
        ],
      });
      post.flush({ id: 'abcdef12-0000-4000-8000-000000000000', valor: 1234.5, status: 'Pendente' });
      fixture.detectChanges();

      expect(texto('[data-testid="orcamento-criado"]')).toContain('#abcdef12');
      expect(texto('[data-testid="valor-criado"]')).toBe('R$ 1.234,50');
      const link = el().querySelector('[data-testid="link-aprovacao"]') as HTMLAnchorElement;
      expect(link.textContent!.trim()).toBe('Abrir aprovação do cliente');
      expect(link.getAttribute('href')).toBe('/aprovar-orcamento?orcamentoId=abcdef12-0000-4000-8000-000000000000');
      expect(link.classList).toContain('btn-secondary');
    });

    it('pré-seleciona a OS da query ordemServicoId', () => {
      montar({ query: { ordemServicoId: OS_EXECUCAO.id } });
      responderCatalogos();

      expect(component.ordemServicoId()).toBe(OS_EXECUCAO.id);
      expect(component.clienteId()).toBe('cli-joao');
      expect(texto('[data-testid="seletor-os"] .cs-trigger')).toBe(`${idCurto(OS_EXECUCAO.id)} · XYZ-9K88 · Uno`);
      expect(texto('[data-testid="resumo-os"]')).toContain('João Souza');
      expect(resolver).not.toHaveBeenCalled();
    });

    it('pré-seleciona a OS da rota e carrega quando ela não está na lista', () => {
      montar({ params: { id: OS_FORA_DA_LISTA.id } });
      responderCatalogos();

      expect(resolver).toHaveBeenCalledWith(OS_FORA_DA_LISTA.id);
      expect(component.ordemServicoId()).toBe(OS_FORA_DA_LISTA.id);
      expect(texto('[data-testid="resumo-os"]')).toContain('Carlos Lima');
      expect(texto('[data-testid="resumo-os"]')).toContain('DEF-4G56');
    });

    it('usa o clienteId da query ou do atalho quando a OS não traz o cliente', () => {
      const semCliente = os('55555555-eeee-4eee-8eee-eeeeeeeeeeee', { veiculoId: 'vei-x' });
      montar({ lista: [semCliente], query: { ordemServicoId: semCliente.id, clienteId: 'cli-query' } });
      responderCatalogos();
      expect(component.clienteId()).toBe('cli-query');
      expect(el().querySelector('[data-testid="resumo-os"] app-id-badge')).not.toBeNull();
    });

    it('usa o clienteId do atalho local quando nem a OS nem a query trazem o cliente', () => {
      const semCliente = os('55555555-eeee-4eee-8eee-eeeeeeeeeeee', {});
      montar({ lista: [semCliente], params: { id: semCliente.id }, jornada: [{ osId: semCliente.id, clienteId: 'cli-atalho' }] });
      responderCatalogos();
      expect(component.clienteId()).toBe('cli-atalho');
    });

    it('pré-seleção de OS inexistente mostra a mensagem de OS não encontrada', () => {
      montar({ carregar: () => throwError(() => new Error('falha')), params: { id: UUID_INEXISTENTE } });
      responderCatalogos();
      expect(component.carregandoOs()).toBe(false);
      expect(texto('[data-testid="erro-os"]')).toBe(MENSAGEM_OS_NAO_ENCONTRADA);
    });
  });

  describe('OrcamentoPage agrupamento', () => {
    it('agrupa itens repetidos somando quantidade, envia valor: 0 com itens únicos e suporta o modo avulso', () => {
      montar({ query: { ordemServicoId: OS_RECEBIDA.id } });
      responderCatalogos();

      component.adicionarServico(component.servicos()[0], 1);
      component.adicionarServico(component.servicos()[0], 2);
      fixture.detectChanges();

      expect(component.itens().length).toBe(1);
      expect(component.itens()[0].quantidade).toBe(3);
      expect(component.itens()[0].subtotal).toBe(300);
      expect(component.total()).toBe(300);

      const qtd = el().querySelector('[data-testid="item-orcamento"] input') as HTMLInputElement;
      qtd.value = '4';
      qtd.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.itens()[0].quantidade).toBe(4);
      expect(component.total()).toBe(400);

      clicarEnviar();
      const postItens = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE);
      expect(postItens.request.body).toEqual({
        ordemServicoId: OS_RECEBIDA.id,
        clienteId: 'cli-maria',
        valor: 0,
        itens: [
          { tipo: 'Servico', referenciaId: 'srv-1', nome: 'Troca de Óleo', quantidade: 4, precoUnitario: 100, subtotal: 400 },
        ],
      });
      postItens.flush({ id: 'orc-1', valor: 400, status: 'Pendente' });
      fixture.detectChanges();
      expect(component.orcamentoCriado()?.id).toBe('orc-1');
      expect(TestBed.inject(OsJornadaStore).obter(OS_RECEBIDA.id)?.orcamentoId).toBe('orc-1');

      const botaoAvulso = el().querySelector('[data-testid="modo-avulso"]') as HTMLButtonElement;
      botaoAvulso.click();
      fixture.detectChanges();
      expect(botaoAvulso.getAttribute('aria-pressed')).toBe('true');
      expect(el().querySelector('[data-testid="modo-itens"]')!.getAttribute('aria-pressed')).toBe('false');

      component.valorAvulso = 250.75;
      component.enviar();
      const postAvulso = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE);
      expect(postAvulso.request.body).toEqual({
        ordemServicoId: OS_RECEBIDA.id,
        clienteId: 'cli-maria',
        valor: 250.75,
        itens: undefined,
      });
      postAvulso.flush(null, { status: 500, statusText: 'Erro' });
      expect(component.enviando()).toBe(false);
    });
  });

  it('remove item pelo botão de ícone com aria-label e não envia sem OS', () => {
    montar({ lista: [] });
    responderCatalogos();

    component.adicionarServico(component.servicos()[0], 1);
    component.adicionarInsumo(component.insumos()[0], 1);
    component.adicionarInsumo(component.insumos()[0], 1);
    component.atualizarQuantidade(9, 3);
    fixture.detectChanges();
    expect(component.itens().length).toBe(2);
    expect(component.itens()[1].quantidade).toBe(2);

    const remover = el().querySelector('[aria-label="Remover Troca de Óleo"]') as HTMLButtonElement;
    expect(remover.className).toContain('btn-icon');
    remover.click();
    fixture.detectChanges();
    expect(component.itens().map(i => i.nome)).toEqual(['Filtro']);

    component.enviar();
    controller.expectNone(API_ENDPOINTS.ORCAMENTOS.BASE);
  });

  it('mantém catálogos vazios quando as listas falham', () => {
    montar();
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    fixture.detectChanges();
    expect(component.servicos()).toEqual([]);
    expect(component.insumos()).toEqual([]);
    expect(el().textContent).toContain('Nenhum serviço disponível.');
  });
});
