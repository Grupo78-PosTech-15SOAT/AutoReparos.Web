import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import { NotificationService } from '../../../../core/ui/notification.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PaginationComponent, CustomSelectComponent, PageContainerComponent, ModalDialogComponent],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.3" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Usuários
          </h1>
        </div>
        <button type="button" (click)="abrirModalNovo()" class="btn btn-primary">
          + Usuário
        </button>
      </div>

      <!-- Tabela de Usuários -->
      <div class="data-table-container table-loading-container">
        @if (loading) {
          <div class="table-loading-overlay">
            <div class="table-loading-spinner"></div>
            <span class="table-loading-text">Carregando dados...</span>
          </div>
        }
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (u of usuarios; track u.id) {
              <tr>
                <td style="font-weight: 600;">{{ u.nome }}</td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="role-badge" [class]="getRoleClass(u.role)">
                    {{ u.role || 'Sem Cargo' }}
                  </span>
                </td>
                <td class="col-acoes">
                  <div class="acoes-linha">
                    <button type="button" (click)="editar(u)" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'Editar ' + u.nome" [title]="'Editar ' + u.nome">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button type="button" (click)="excluir(u.id!)" class="btn btn-ghost btn-danger btn-icon btn-sm" [attr.aria-label]="'Excluir ' + u.nome" [title]="'Excluir ' + u.nome">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty-state">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginação Estruturada -->
      <app-pagination
        [pageNumber]="pageNumber"
        [pageSize]="pageSize"
        [totalItems]="totalItems"
        [totalPages]="totalPages"
        [pageSizeOptions]="[5, 10, 20, 50]"
        (pageChange)="onPageChange($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-pagination>

      <!-- Modal de Criar / Editar Usuário -->
      <app-modal-dialog
        [isOpen]="exibirModal"
        [title]="editandoId ? 'Editar Usuário' : 'Novo Usuário de Sistema'"
        (close)="exibirModal = false"
      >
        <form (ngSubmit)="salvar()">
          <div class="form-group">
            <label class="form-label" for="usu-nome">Nome Completo</label>
            <input type="text" [(ngModel)]="formUsuario.nome" id="usu-nome" name="nome" required placeholder="Ex: João da Silva" class="form-control" />
          </div>

          <div class="form-group">
            <label class="form-label" for="usu-email">E-mail Corporativo</label>
            <input type="email" [(ngModel)]="formUsuario.email" id="usu-email" name="email" required [disabled]="!!editandoId" placeholder="mecanico@autoreparos.com" class="form-control" />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="usu-role">Perfil de Acesso (Role)</label>
              <app-custom-select
                [options]="roleOptions"
                [value]="formUsuario.role || 'Mecanico'"
                idGatilho="usu-role"
                placeholder="Selecione o Perfil"
                (valueChange)="formUsuario.role = $any($event)"
              ></app-custom-select>
            </div>

            @if (!editandoId) {
              <div class="form-group">
                <label class="form-label" for="usu-senha">Senha Inicial</label>
                <input type="password" [(ngModel)]="formUsuario.senha" id="usu-senha" name="senha" required placeholder="••••••••" class="form-control" />
              </div>
            }
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" (click)="exibirModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">{{ editandoId ? 'Salvar Usuário' : 'Criar Usuário' }}</button>
          </div>
        </form>
      </app-modal-dialog>
    </app-page-container>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .page-title { display: flex; align-items: center; gap: 0.5rem; }
    .role-badge { padding: 0.25rem 0.65rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; display: inline-block; text-transform: uppercase; border: 1px solid transparent; }
    .role-badge.administrador { background: var(--primary-subtle); color: var(--primary); border-color: var(--border-pink); }
    .role-badge.atendente { background: var(--info-bg); color: var(--info); border-color: var(--info); }
    .role-badge.mecanico { background: var(--warning-bg); color: var(--warning); border-color: var(--warning); }
    .role-badge.sem-cargo { background: var(--bg-surface-hover); color: var(--text-muted); border-color: var(--border-color); }
  `]
})
export class UsuariosPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  usuarios: Usuario[] = [];
  exibirModal = false;
  editandoId: string | null = null;

  roleOptions: SelectOption[] = [
    { value: 'Administrador', label: 'Administrador' },
    { value: 'Atendente', label: 'Atendente' },
    { value: 'Mecanico', label: 'Mecânico' }
  ];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  formUsuario: Usuario = {
    nome: '',
    email: '',
    role: 'Mecanico',
    senha: ''
  };

  loading = false;
  private readonly usuarioService = inject(UsuarioService);
  private readonly notification = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  getRoleClass(role?: string): string {
    if (!role) return 'sem-cargo';
    return role.toLowerCase().replace(/\s+/g, '-');
  }

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.usuarioService.getAll(this.pageNumber, this.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.usuarios = res.items || [];
        this.totalItems = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.carregar();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageNumber = 1;
    this.carregar();
  }

  abrirModalNovo() {
    this.editandoId = null;
    this.formUsuario = { nome: '', email: '', role: 'Mecanico', senha: '' };
    this.exibirModal = true;
  }

  editar(u: Usuario) {
    this.editandoId = u.id || null;
    this.formUsuario = { nome: u.nome, email: u.email, role: u.role, senha: '' };
    this.exibirModal = true;
  }

  salvar() {
    if (this.editandoId) {
      this.usuarioService
        .atualizar(this.editandoId, { nomeCompleto: this.formUsuario.nome, tipo: this.formUsuario.role })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notification.success('Usuário Atualizado', 'Dados do usuário salvos.');
            this.exibirModal = false;
            this.carregar();
          }
        });
      return;
    }
    this.usuarioService.criar(this.formUsuario).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notification.success('Usuário Criado', 'Conta cadastrada com sucesso.');
        this.exibirModal = false;
        this.carregar();
      }
    });
  }

  excluir(id: string) {
    if (confirm('Deseja excluir esta conta de usuário?')) {
      this.usuarioService.excluir(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.info('Usuário Removido', 'Conta excluída.');
          this.carregar();
        }
      });
    }
  }
}
