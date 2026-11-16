import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InsumosPageComponent } from './insumos-page.component';
import { InsumoService } from '../../services/insumo.service';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

describe('InsumosPage', () => {
  let fixture: ComponentFixture<InsumosPageComponent>;
  let component: InsumosPageComponent;
  let controller: HttpTestingController;
  let service: InsumoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsumosPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InsumosPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(InsumoService);
  });

  afterEach(() => controller.verify());

  it('lista insumos em GET /api/v1/insumos exibindo saldo disponível e reservado, sem editar nem excluir', () => {
    fixture.detectChanges();

    const req = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'ins-1',
        nome: 'Filtro de Óleo',
        descricao: 'Sintético',
        precoUnitario: 45.5,
        saldoDisponivel: 12,
        saldoReservado: 3,
      },
    ]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Filtro de Óleo');
    expect(texto).toContain('Sintético');
    expect(
      fixture.nativeElement.querySelector('[data-testid="saldo-disponivel"]').textContent.trim()
    ).toBe('12');
    expect(
      fixture.nativeElement.querySelector('[data-testid="saldo-reservado"]').textContent.trim()
    ).toBe('3');

    expect(texto).not.toContain('Editar');
    expect(texto).not.toContain('Excluir');
    expect('atualizar' in service).toBe(false);
    expect('excluir' in service).toBe(false);
  });

  it('cadastra novo insumo em POST /api/v1/insumos e recarrega a lista', () => {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([]);
    fixture.detectChanges();

    component.abrirModalNovo();
    component.formInsumo = {
      nome: 'Pastilha de Freio',
      descricao: 'Dianteira',
      precoUnitario: 120,
      saldoDisponivel: 8,
    };
    component.salvarNovo();

    const post = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toMatchObject({
      nome: 'Pastilha de Freio',
      descricao: 'Dianteira',
      precoUnitario: 120,
      saldoDisponivel: 8,
    });
    post.flush({ id: 'ins-2', nome: 'Pastilha de Freio', precoUnitario: 120, saldoDisponivel: 8, saldoReservado: 0 });

    const reload = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
    expect(reload.request.method).toBe('GET');
    reload.flush({ items: [{ id: 'ins-2', nome: 'Pastilha de Freio', valor: 120, quantidadeEstoque: 8, saldoReservado: 0 }] });
    fixture.detectChanges();

    expect(component.exibirModalNovo()).toBe(false);
    expect(component.insumos()).toHaveLength(1);
    expect(component.insumos()[0].nome).toBe('Pastilha de Freio');
  });

  it('registra entrada de estoque em POST /api/v1/insumos/{id}/entradas com quantidade e motivo', () => {
    fixture.detectChanges();
    const item = { id: 'ins-1', nome: 'Óleo 5W30', precoUnitario: 50, saldoDisponivel: 4, saldoReservado: 1 };
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([item]);
    fixture.detectChanges();

    component.abrirModalEntrada(item);
    expect(component.insumoEntrada()?.id).toBe('ins-1');

    component.formEntrada = { quantidade: 10, motivo: 'Reposição fornecedor' };
    component.confirmarEntrada();

    const post = controller.expectOne(API_ENDPOINTS.INSUMOS.ENTRADAS('ins-1'));
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ quantidade: 10, motivo: 'Reposição fornecedor' });
    post.flush({ ...item, saldoDisponivel: 14 });

    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([{ ...item, saldoDisponivel: 14 }]);
    fixture.detectChanges();

    expect(component.insumoEntrada()).toBeNull();
    expect(component.insumos()[0].saldoDisponivel).toBe(14);
  });

  it('suporta getAll paginado e trata falhas de rede limpando estados de carregamento', () => {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.loading()).toBe(false);

    let total = 0;
    service.getAll(1, 10).subscribe(res => (total = res.total));
    controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush({ itens: [{ id: '1', nome: 'Vela', valor: 30, quantidadeEstoque: 5 }] });
    expect(total).toBe(1);

    component.abrirModalEntrada({ id: '1', nome: 'Vela' });
    component.fecharModalEntrada();
    expect(component.insumoEntrada()).toBeNull();
  });
});
