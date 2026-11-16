import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { roleGuard } from './role.guard';
import { AuthService } from '../../features/auth/services/auth.service';
import { NotificationService } from '../ui/notification.service';
import { STORAGE_TOKEN } from '../tokens/storage.token';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { HomePageComponent } from '../../features/home/pages/home-page/home-page.component';

function criarStorage(papel: string | null): Storage {
  const dados = new Map<string, string>();
  if (papel) {
    dados.set('autoreparos_token', 'jwt-token');
    dados.set('autoreparos_user', JSON.stringify({ email: 'user@autoreparos.com', nome: 'Operador', role: papel }));
  }
  return {
    get length() { return dados.size; },
    clear: () => dados.clear(),
    getItem: (k: string) => dados.get(k) ?? null,
    key: () => null,
    removeItem: (k: string) => { dados.delete(k); },
    setItem: (k: string, v: string) => { dados.set(k, v); },
  };
}

describe('RoleGuard', () => {
  function configurar(papel: string | null) {
    const storage = criarStorage(papel);
    TestBed.configureTestingModule({
      imports: [NavbarComponent, HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_TOKEN, useValue: storage },
      ],
    });
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const notificacao = TestBed.inject(NotificationService);
    const auth = TestBed.inject(AuthService);
    return { router, navegar, notificacao, auth };
  }

  function executarGuard(roles?: string[]) {
    const route = { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/sagas' } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(route, state));
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('permite acesso a /sagas quando o usuário é Administrador', () => {
    const { navegar, notificacao } = configurar('Administrador');
    const resultado = executarGuard(['Administrador']);
    expect(resultado).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
    expect(notificacao.toasts()).toHaveLength(0);
  });

  it('permite acesso quando a rota não define roles restritas', () => {
    configurar('Atendente');
    expect(executarGuard()).toBe(true);
    expect(executarGuard([])).toBe(true);
  });

  it.each(['Atendente', 'Mecanico', null])('bloqueia a rota /sagas para perfil %s e redireciona para /ordens-servico/fila', (papel) => {
    const { navegar, notificacao } = configurar(papel);
    const resultado = executarGuard(['Administrador']);
    expect(resultado).toBe(false);
    expect(notificacao.toasts()).toHaveLength(1);
    expect(notificacao.toasts()[0].title).toBe('Acesso Negado');
    expect(navegar).toHaveBeenCalledWith(['/ordens-servico/fila']);
  });

  it('exibe o item de menu /sagas na navegação para Administrador', () => {
    configurar('Administrador');
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    const links = Array.from(elemento.querySelectorAll('a')).map(a => a.getAttribute('href') || a.getAttribute('ng-reflect-router-link') || a.textContent?.trim());
    expect(elemento.textContent).toContain('Sagas');
    expect(links.some(l => l?.includes('/sagas') || l === 'Sagas')).toBe(true);

    fixture.componentInstance.toggleMobileMenu();
    expect(fixture.componentInstance.isMobileMenuOpen()).toBe(true);
    fixture.componentInstance.closeMobileMenu();
    expect(fixture.componentInstance.isMobileMenuOpen()).toBe(false);

    const home = TestBed.createComponent(HomePageComponent);
    home.detectChanges();
    expect(home.nativeElement.textContent).toContain('Console de Sagas');
  });

  it.each(['Atendente', 'Mecanico', null])('oculta o item de menu /sagas na navegação para %s', (papel) => {
    configurar(papel);
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    const linksSagas = Array.from(elemento.querySelectorAll('a')).filter(
      a => a.getAttribute('href') === '/sagas' || a.textContent?.trim() === 'Sagas'
    );
    expect(linksSagas).toHaveLength(0);

    const home = TestBed.createComponent(HomePageComponent);
    home.detectChanges();
    expect(home.nativeElement.textContent).not.toContain('Console de Sagas');
  });
});
