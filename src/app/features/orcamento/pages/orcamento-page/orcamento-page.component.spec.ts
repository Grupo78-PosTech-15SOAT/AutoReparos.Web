import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { OrcamentoPageComponent } from './orcamento-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';

describe('OrcamentoPage', () => {
  let fixture: ComponentFixture<OrcamentoPageComponent>;
  let component: OrcamentoPageComponent;
  let controller: HttpTestingController;

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
      imports: [OrcamentoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'os-101' }),
              queryParamMap: convertToParamMap({ clienteId: 'cli-202' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrcamentoPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('OrcamentoPage agrupamento', () => {
    it('agrupa itens repetidos somando quantidade, exibe total no cliente e envia valor: 0 com itens únicos; e suporta modo avulso sem itens', () => {
      fixture.detectChanges();

      const reqServicos = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
      expect(reqServicos.request.method).toBe('GET');
      reqServicos.flush([{ id: 'srv-1', nome: 'Troca de Óleo', precoBase: 100 }]);

      const reqInsumos = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
      expect(reqInsumos.request.method).toBe('GET');
      reqInsumos.flush([{ id: 'ins-1', nome: 'Filtro', precoUnitario: 50, quantidadeDisponivel: 10 }]);
      fixture.detectChanges();

      // Adiciona o mesmo serviço duas vezes (1 + 2 = 3)
      component.adicionarServico(component.servicos()[0], 1);
      component.adicionarServico(component.servicos()[0], 2);
      fixture.detectChanges();

      expect(component.itens().length).toBe(1);
      expect(component.itens()[0].quantidade).toBe(3);
      expect(component.itens()[0].subtotal).toBe(300);
      expect(component.total()).toBe(300);

      // Edita a quantidade na lista (ex: altera de 3 para 4)
      component.atualizarQuantidade(0, 4);
      fixture.detectChanges();
      expect(component.itens()[0].quantidade).toBe(4);
      expect(component.itens()[0].subtotal).toBe(400);
      expect(component.total()).toBe(400);

      // Envia modo itens: deve enviar valor: 0 e lista de itens
      component.enviar();

      const postItens = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE);
      expect(postItens.request.method).toBe('POST');
      expect(postItens.request.body).toEqual({
        ordemServicoId: 'os-101',
        clienteId: 'cli-202',
        valor: 0,
        itens: [
          {
            tipo: 'Servico',
            referenciaId: 'srv-1',
            nome: 'Troca de Óleo',
            quantidade: 4,
            precoUnitario: 100,
            subtotal: 400,
          },
        ],
      });
      postItens.flush({
        id: 'orc-1',
        ordemServicoId: 'os-101',
        clienteId: 'cli-202',
        valor: 400,
        status: 'Pendente',
      });
      fixture.detectChanges();

      expect(component.orcamentoCriado()?.id).toBe('orc-1');

      // Modo avulso: alterna e envia valor > 0 sem itens
      component.modo.set('avulso');
      component.valorAvulso = 250.75;
      component.enviar();

      const postAvulso = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE);
      expect(postAvulso.request.method).toBe('POST');
      expect(postAvulso.request.body).toEqual({
        ordemServicoId: 'os-101',
        clienteId: 'cli-202',
        valor: 250.75,
        itens: undefined,
      });
      postAvulso.flush({
        id: 'orc-2',
        ordemServicoId: 'os-101',
        clienteId: 'cli-202',
        valor: 250.75,
        status: 'Pendente',
      });
      fixture.detectChanges();
      expect(component.orcamentoCriado()?.id).toBe('orc-2');
    });
  });

  it('permite remover item da lista', () => {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush([{ id: 'srv-1', nome: 'Alinhamento', precoBase: 80 }]);
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([]);
    fixture.detectChanges();

    component.adicionarServico(component.servicos()[0], 1);
    expect(component.itens().length).toBe(1);

    component.removerItem(0);
    expect(component.itens().length).toBe(0);
    expect(component.total()).toBe(0);
  });
});
