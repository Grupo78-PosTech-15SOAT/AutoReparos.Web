import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/pages/home-page/home-page.component').then(m => m.HomePageComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login-page/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'ordens-servico/fila',
    loadComponent: () => import('./features/ordens-servico/pages/os-kanban-page/os-kanban-page.component').then(m => m.OsKanbanPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ordens-servico/nova',
    loadComponent: () => import('./features/ordens-servico/pages/os-nova-page/os-nova-page.component').then(m => m.OsNovaPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Atendente', 'Administrador'] }
  },
  {
    path: 'ordens-servico/:id/orcamento',
    loadComponent: () => import('./features/orcamento/pages/orcamento-page/orcamento-page.component').then(m => m.OrcamentoPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Atendente', 'Administrador'] }
  },
  {
    path: 'ordens-servico/:id',
    loadComponent: () => import('./features/ordens-servico/pages/os-detalhe-page/os-detalhe-page.component').then(m => m.OsDetalhePageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ordens-servico',
    redirectTo: 'ordens-servico/fila',
    pathMatch: 'full'
  },
  {
    path: 'orcamentos/novo',
    loadComponent: () => import('./features/orcamento/pages/orcamento-page/orcamento-page.component').then(m => m.OrcamentoPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Atendente', 'Administrador'] }
  },
  {
    path: 'pagamentos/:id',
    loadComponent: () => import('./features/pagamento/pages/pagamento-page/pagamento-page.component').then(m => m.PagamentoPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pagamentos',
    loadComponent: () => import('./features/pagamento/pages/pagamento-page/pagamento-page.component').then(m => m.PagamentoPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'fila-execucao',
    loadComponent: () => import('./features/execucao/pages/fila-execucao-page/fila-execucao-page.component').then(m => m.FilaExecucaoPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Mecanico', 'Administrador'] }
  },
  {
    path: 'sagas',
    loadComponent: () => import('./features/sagas/pages/sagas-page/sagas-page.component').then(m => m.SagasPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'clientes',
    loadComponent: () => import('./features/clientes/pages/clientes-page/clientes-page.component').then(m => m.ClientesPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'veiculos',
    loadComponent: () => import('./features/veiculos/pages/veiculos-page/veiculos-page.component').then(m => m.VeiculosPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'insumos',
    loadComponent: () => import('./features/insumos/pages/insumos-page/insumos-page.component').then(m => m.InsumosPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador', 'Atendente', 'Mecanico'] }
  },
  {
    path: 'servicos',
    loadComponent: () => import('./features/servicos/pages/servicos-page/servicos-page.component').then(m => m.ServicosPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador', 'Atendente', 'Mecanico'] }
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./features/usuarios/pages/usuarios-page/usuarios-page.component').then(m => m.UsuariosPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'consulta-publica',
    loadComponent: () => import('./features/portal-publico/pages/consulta-publica-page/consulta-publica-page.component').then(m => m.ConsultaPublicaPageComponent)
  },
  {
    path: 'aprovar-orcamento',
    loadComponent: () => import('./features/portal-publico/pages/aprovacao-orcamento-page/aprovacao-orcamento-page.component').then(m => m.AprovacaoOrcamentoPageComponent)
  },
  { path: '**', redirectTo: '' }
];
