import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../features/auth/services/auth.service';

@Component({ standalone: true, template: '' })
class PaginaVaziaComponent {}

class AuthFake {
  readonly currentUser = signal<{ email: string; role: string } | null>({ email: 'admin@auto.com', role: 'Administrador' });
  hasRole(papeis: string[]): boolean {
    const papel = this.currentUser()?.role;
    return !!papel && papeis.includes(papel);
  }
  logout(): void {}
}

describe('Navbar ordens de servico', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([
          { path: '', component: PaginaVaziaComponent, pathMatch: 'full' },
          { path: 'ordens-servico/fila', component: PaginaVaziaComponent },
          { path: 'ordens-servico/nova', component: PaginaVaziaComponent },
          { path: 'ordens-servico/:id', component: PaginaVaziaComponent },
          { path: 'ordens-servico', component: PaginaVaziaComponent, pathMatch: 'full' },
          { path: '**', component: PaginaVaziaComponent },
        ]),
        { provide: AuthService, useClass: AuthFake },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
  });

  function itensDeOs(): HTMLAnchorElement[] {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-item')) as HTMLAnchorElement[];
    return links.filter(a => (a.getAttribute('href') ?? '').startsWith('/ordens-servico'));
  }

  async function navegar(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('tem um único item "Ordens de Serviço" apontando para /ordens-servico e nenhum "Fila Kanban"', () => {
    const itens = itensDeOs();
    expect(itens).toHaveLength(1);
    expect(itens[0].getAttribute('href')).toBe('/ordens-servico');
    expect(itens[0].textContent?.trim()).toBe('Ordens de Serviço');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Fila Kanban');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Kanban');
  });

  it.each(['/ordens-servico/aaaaaaaa-1111-4111-8111-111111111111', '/ordens-servico/fila', '/ordens-servico/nova'])(
    'marca "Ordens de Serviço" como ativo em %s',
    async url => {
      await navegar(url);
      expect(itensDeOs()[0].classList).toContain('active');
    }
  );

  it('não marca "Ordens de Serviço" como ativo em outra área', async () => {
    await navegar('/clientes');
    expect(itensDeOs()[0].classList).not.toContain('active');
  });
});
