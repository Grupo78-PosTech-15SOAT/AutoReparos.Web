import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ServicosPageComponent } from './servicos-page.component';
import { ServicoService } from '../../services/servico.service';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';

describe('ServicosPage', () => {
  let fixture: ComponentFixture<ServicosPageComponent>;
  let component: ServicosPageComponent;
  let controller: HttpTestingController;
  let service: ServicoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicosPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicosPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ServicoService);
  });

  afterEach(() => controller.verify());

  it('lista serviços em GET /api/v1/servicos sem botões de editar nem excluir', () => {
    fixture.detectChanges();

    const req = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'srv-1',
        nome: 'Alinhamento 3D',
        descricao: 'Suspensão dianteira e traseira',
        precoBase: 150,
      },
    ]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Alinhamento 3D');
    expect(texto).toContain('Suspensão dianteira e traseira');
    expect(texto).toContain('150');
    expect(texto).not.toContain('Editar');
    expect(texto).not.toContain('Excluir');
    expect('atualizar' in service).toBe(false);
    expect('excluir' in service).toBe(false);
  });

  it('cadastra serviço em POST /api/v1/servicos e recarrega a lista', () => {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush([]);
    fixture.detectChanges();

    component.abrirModalNovo();
    component.formServico = {
      nome: 'Balanceamento',
      descricao: '4 rodas',
      precoBase: 90,
    };
    component.salvar();

    const post = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toMatchObject({
      nome: 'Balanceamento',
      descricao: '4 rodas',
      precoBase: 90,
    });
    post.flush({ id: 'srv-2', nome: 'Balanceamento', precoBase: 90 });

    const reload = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
    expect(reload.request.method).toBe('GET');
    reload.flush({ items: [{ id: 'srv-2', nome: 'Balanceamento', valorTabelado: 90 }] });
    fixture.detectChanges();

    expect(component.exibirModal()).toBe(false);
    expect(component.servicos()).toHaveLength(1);
    expect(component.servicos()[0].precoBase).toBe(90);
  });

  it('suporta getAll e trata erros de rede limpando carregamento', () => {
    fixture.detectChanges();
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush(null, { status: 500, statusText: 'Erro' });
    expect(component.loading()).toBe(false);

    let total = 0;
    service.getAll(1, 10).subscribe(res => (total = res.total));
    controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush({ itens: [{ id: '1', nome: 'Revisão', precoBase: 200 }] });
    expect(total).toBe(1);
  });
});
