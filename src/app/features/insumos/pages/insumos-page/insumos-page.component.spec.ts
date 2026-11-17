import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InsumosPageComponent } from './insumos-page.component';
import { InsumoService } from '../../services/insumo.service';
import { API_ENDPOINTS } from '../../../../core/config/api-endpoints';
import { AuthService } from '../../../auth/services/auth.service';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';

describe('InsumosPage', () => {
  let fixture: ComponentFixture<InsumosPageComponent>;
  let component: InsumosPageComponent;
  let controller: HttpTestingController;
  let service: InsumoService;
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
      imports: [InsumosPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InsumosPageComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(InsumoService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => controller.verify());

  describe('InsumosPage estoque', () => {
    it('lê quantidadeDisponivel, quantidadeReservada e precoUnitario no GET, envia quantidadeInicial no POST e quantidade em entradas', () => {
      authService.currentUser.set({
        id: '1',
        nome: 'Admin',
        nomeCompleto: 'Admin',
        email: 'admin@auto.com',
        role: 'Administrador'
      });
      fixture.detectChanges();

      const req = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 'ins-1',
          nome: 'Filtro de Óleo',
          descricao: '',
          precoUnitario: 45.5,
          quantidadeDisponivel: 12,
          quantidadeReservada: 3,
        },
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="saldo-disponivel"]').textContent.trim()).toBe('12');
      expect(fixture.nativeElement.querySelector('[data-testid="saldo-reservado"]').textContent.trim()).toBe('3');
      expect(fixture.nativeElement.querySelector('[data-testid="preco-insumo"]').textContent).toMatch(/45[,.]50/);

      // Cadastro de novo insumo com descrição vazia
      component.formInsumo = {
        nome: 'Fluido de Freio',
        descricao: '   ',
        precoUnitario: 35,
        quantidadeInicial: 10,
      };
      component.salvarNovo();

      const post = controller.expectOne(API_ENDPOINTS.INSUMOS.BASE);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({
        nome: 'Fluido de Freio',
        precoUnitario: 35,
        quantidadeInicial: 10,
        quantidadeDisponivel: 10,
        saldoDisponivel: 10,
      });
      expect('descricao' in post.request.body).toBe(false);
      post.flush({ id: 'ins-2', nome: 'Fluido de Freio', quantidadeDisponivel: 10 });

      controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([]);
      fixture.detectChanges();

      // Registro de entrada
      component.abrirModalEntrada({ id: 'ins-2', nome: 'Fluido de Freio' });
      component.formEntrada = { quantidade: 5 };
      component.confirmarEntrada();

      const entradaPost = controller.expectOne(API_ENDPOINTS.INSUMOS.ENTRADAS('ins-2'));
      expect(entradaPost.request.method).toBe('POST');
      expect(entradaPost.request.body).toEqual({ quantidade: 5 });
      entradaPost.flush({ id: 'ins-2', quantidadeDisponivel: 15 });

      controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([]);
      fixture.detectChanges();
    });
  });

  describe('InsumosPage permissoes', () => {
    it('controla visibilidade dos botões conforme os papéis de Administrador, Atendente e Mecânico', () => {
      // Mecânico: não pode cadastrar insumo nem registrar entrada
      authService.currentUser.set({
        id: '3',
        nome: 'Mecânico',
        nomeCompleto: 'Mecânico',
        email: 'mecanico@auto.com',
        role: 'Mecanico'
      });
      fixture.detectChanges();
      controller.expectOne(API_ENDPOINTS.INSUMOS.BASE).flush([
        { id: 'ins-1', nome: 'Vela', precoUnitario: 20, quantidadeDisponivel: 5, quantidadeReservada: 0 }
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="btn-novo-insumo"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="btn-registrar-entrada"]')).toBeNull();

      // Atendente: não pode cadastrar novo insumo, mas PODE registrar entrada de estoque
      authService.currentUser.set({
        id: '2',
        nome: 'Atendente',
        nomeCompleto: 'Atendente',
        email: 'atendente@auto.com',
        role: 'Atendente'
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="btn-novo-insumo"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="btn-registrar-entrada"]')).toBeTruthy();

      // Administrador: pode cadastrar novo insumo e registrar entrada
      authService.currentUser.set({
        id: '1',
        nome: 'Admin',
        nomeCompleto: 'Admin',
        email: 'admin@auto.com',
        role: 'Administrador'
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="btn-novo-insumo"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="btn-registrar-entrada"]')).toBeTruthy();
    });
  });

  it('lista insumos em GET /api/v1/insumos sem editar nem excluir', () => {
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
    expect(texto).not.toContain('Editar');
    expect(texto).not.toContain('Excluir');
  });
});
