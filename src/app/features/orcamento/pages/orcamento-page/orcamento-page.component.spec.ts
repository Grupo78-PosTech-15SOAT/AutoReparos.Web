import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { OrcamentoPageComponent } from './orcamento-page.component';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

describe('OrcamentoPage', () => {
  let fixture: ComponentFixture<OrcamentoPageComponent>;
  let component: OrcamentoPageComponent;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrcamentoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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

  it('lista serviços e insumos com preço e saldo, soma o total e envia POST /api/v1/orcamentos exibindo id, status e valor', () => {
    fixture.detectChanges();

    const reqServicos = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(reqServicos.request.method).toBe('GET');
    reqServicos.flush([{ id: 'srv-1', nome: 'Troca de Óleo', precoBase: 100 }]);

    const reqInsumos = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(reqInsumos.request.method).toBe('GET');
    reqInsumos.flush([{ id: 'ins-1', nome: 'Óleo 5W30', precoUnitario: 55, saldoDisponivel: 15 }]);
    fixture.detectChanges();

    const textoCatalogo = fixture.nativeElement.textContent as string;
    expect(textoCatalogo).toContain('Troca de Óleo');
    expect(textoCatalogo).toContain('Óleo 5W30');
    expect(textoCatalogo).toContain('Saldo: 15');

    component.adicionarServico(component.servicos()[0], 1);
    component.adicionarInsumo(component.insumos()[0], 2);
    fixture.detectChanges();

    expect(component.total()).toBe(210);
    expect(
      fixture.nativeElement.querySelector('[data-testid="total-orcamento"]').textContent
    ).toContain('210');

    component.enviar();

    const post = controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      ordemServicoId: 'os-101',
      clienteId: 'cli-202',
      valor: 210,
      itens: [
        {
          tipo: 'Servico',
          referenciaId: 'srv-1',
          nome: 'Troca de Óleo',
          quantidade: 1,
          precoUnitario: 100,
          subtotal: 100,
        },
        {
          tipo: 'Insumo',
          referenciaId: 'ins-1',
          nome: 'Óleo 5W30',
          quantidade: 2,
          precoUnitario: 55,
          subtotal: 110,
        },
      ],
    });

    post.flush({
      id: 'orc-999',
      ordemServicoId: 'os-101',
      clienteId: 'cli-202',
      valor: 210,
      status: 'Pendente',
    });
    fixture.detectChanges();

    const blocoCriado = fixture.nativeElement.querySelector('[data-testid="orcamento-criado"]').textContent as string;
    expect(blocoCriado).toContain('orc-999');
    expect(blocoCriado).toContain('Pendente');
    expect(blocoCriado).toContain('210');
  });

  it('permite remover item e trata erro ao enviar ou carregar catálogo', () => {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush(null, { status: 500, statusText: 'Erro' });

    component.adicionarServico({ id: 's1', nome: 'Diagnostico', valorTabelado: 80 }, 1);
    component.adicionarInsumo({ id: 'i1', nome: 'Aditivo', valor: 40, quantidadeEstoque: 3 }, 1);
    expect(component.total()).toBe(120);

    component.removerItem(0);
    expect(component.itens()).toHaveLength(1);
    expect(component.total()).toBe(40);

    component.enviar();
    controller.expectOne(API_ENDPOINTS.ORCAMENTOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.enviando()).toBe(false);
    expect(component.orcamentoCriado()).toBeNull();
  });
});
