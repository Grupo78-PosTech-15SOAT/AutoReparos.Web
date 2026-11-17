import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { STORAGE_TOKEN } from '../../../core/tokens/storage.token';
import { OsJornadaStore, CHAVE_JORNADA_OS } from '../../../core/store/os-jornada.store';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';

describe('AuthService', () => {
  let service: AuthService;
  let store: OsJornadaStore;
  let httpMock: HttpTestingController;
  let storageMap: Map<string, string>;
  let router: Router;

  beforeEach(() => {
    storageMap = new Map<string, string>();
    const mockStorage: Storage = {
      get length() { return storageMap.size; },
      clear: () => storageMap.clear(),
      getItem: (k: string) => storageMap.get(k) ?? null,
      key: () => null,
      removeItem: (k: string) => { storageMap.delete(k); },
      setItem: (k: string, v: string) => { storageMap.set(k, v); },
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: STORAGE_TOKEN, useValue: mockStorage },
        OsJornadaStore,
        AuthService,
      ]
    });

    service = TestBed.inject(AuthService);
    store = TestBed.inject(OsJornadaStore);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login salva token e usuário no storage e atualiza currentUser', () => {
    service.login({ email: 'admin@auto.com', password: '123' }).subscribe();

    const req = httpMock.expectOne(API_ENDPOINTS.AUTH.LOGIN);
    expect(req.request.method).toBe('POST');
    req.flush({
      token: 'jwt-token-123',
      usuario: { id: 'u-1', nome: 'Admin', role: 'Administrador', email: 'admin@auto.com' }
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.role).toBe('Administrador');
    expect(service.hasRole(['Administrador'])).toBe(true);
    expect(service.hasRole(['Mecanico'])).toBe(false);
  });

  it('logout limpa token, user e chama limpar() no OsJornadaStore', () => {
    store.salvar({ osId: 'os-teste' });
    expect(store.registros().length).toBe(1);

    storageMap.set('autoreparos_token', 'token-123');
    storageMap.set('autoreparos_user', JSON.stringify({ email: 'a@a.com', role: 'Admin' }));
    service.currentUser.set({ email: 'a@a.com', role: 'Admin' });

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(store.registros()).toEqual([]);
    expect(storageMap.has(CHAVE_JORNADA_OS)).toBe(false);
  });
});
