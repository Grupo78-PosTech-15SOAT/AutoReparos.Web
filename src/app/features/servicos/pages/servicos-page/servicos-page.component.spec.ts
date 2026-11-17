import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ServicosPageComponent } from './servicos-page.component';
import { ServicoService } from '../../services/servico.service';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { AuthService } from '../../../auth/services/auth.service';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';

describe('ServicosPage', () => {
  let fixture: ComponentFixture<ServicosPageComponent>;
  let component: ServicosPageComponent;
  let controller: HttpTestingController;
  let service: ServicoService;
  let authService: AuthService;

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
      imports: [ServicosPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicosPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ServicoService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => controller.verify());

  describe('ServicosPage precoUnitario', () => {
    it('mapeia precoUnitario no GET, exibe formato monetário e envia precoUnitario omitindo descricao vazia no POST', () => {
      authService.currentUser.set({
        id: '1',
        nome: 'Admin',
        nomeCompleto: 'Admin',
        email: 'admin@auto.com',
        role: 'Administrador'
      });
      fixture.detectChanges();

      const req = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 'srv-1',
          nome: 'Troca de Óleo',
          descricao: '',
          precoUnitario: 150,
        },
      ]);
      fixture.detectChanges();

      const precoEl = fixture.nativeElement.querySelector('[data-testid="preco-servico"]');
      expect(precoEl.textContent).toMatch(/150[,.]00/);

      // Teste de criação com descrição vazia (deve omitir descricao do payload)
      component.formServico = {
        nome: 'Revisão Básica',
        descricao: '   ',
        precoUnitario: 250,
      };
      component.salvar();

      const post = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({
        nome: 'Revisão Básica',
        precoUnitario: 250,
        precoBase: 250,
        valorTabelado: 250,
      });
      expect('descricao' in post.request.body).toBe(false);
      post.flush({ id: 'srv-2', nome: 'Revisão Básica', precoUnitario: 250 });

      const reload = controller.expectOne(API_ENDPOINTS.SERVICOS.BASE);
      reload.flush([]);
      fixture.detectChanges();
    });
  });

  describe('ServicosPage permissoes', () => {
    it('exibe botão de novo serviço apenas para Administrador', () => {
      authService.currentUser.set({
        id: '2',
        nome: 'Mecânico',
        nomeCompleto: 'Mecânico',
        email: 'mecanico@auto.com',
        role: 'Mecanico'
      });
      fixture.detectChanges();
      controller.expectOne(API_ENDPOINTS.SERVICOS.BASE).flush([]);
      fixture.detectChanges();

      let btnNovo = fixture.nativeElement.querySelector('[data-testid="btn-novo-servico"]');
      expect(btnNovo).toBeNull();

      authService.currentUser.set({
        id: '1',
        nome: 'Admin',
        nomeCompleto: 'Admin',
        email: 'admin@auto.com',
        role: 'Administrador'
      });
      fixture.detectChanges();

      btnNovo = fixture.nativeElement.querySelector('[data-testid="btn-novo-servico"]');
      expect(btnNovo).toBeTruthy();
    });
  });

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
  });
});
