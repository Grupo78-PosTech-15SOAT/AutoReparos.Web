import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { Cliente } from '../../models/cliente.model';
import { MaskDirective } from '../../../../shared/directives/mask.directive';
import { NotificationService } from '../../../../core/ui/notification.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { DocumentoBadgeComponent } from '../../../../shared/components/documento-badge/documento-badge.component';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';

@Component({
  selector: 'app-clientes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MaskDirective,
    PaginationComponent,
    CustomSelectComponent,
    PageContainerComponent,
    DocumentoBadgeComponent,
    ModalDialogComponent
  ],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Clientes
          </h1>
        </div>
        <button type="button" (click)="abrirModalNovo()" class="btn btn-primary">
          + Cliente
        </button>
      </div>

      <!-- Tabela de Clientes -->
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
              <th>Nome / Razão Social</th>
              <th>Documento</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (c of clientes; track c.id) {
              <tr>
                <td style="font-weight: 600;">{{ c.nome }}</td>
                <td>
                  <app-documento-badge [documento]="c.documento"></app-documento-badge>
                </td>
                <td>{{ c.email }}</td>
                <td>{{ c.telefone }}</td>
                <td class="col-acoes">
                  <div class="acoes-linha">
                    <button type="button" (click)="editar(c)" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'Editar ' + c.nome" [title]="'Editar ' + c.nome">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button type="button" (click)="excluir(c.id!)" class="btn btn-ghost btn-danger btn-icon btn-sm" [attr.aria-label]="'Excluir ' + c.nome" [title]="'Excluir ' + c.nome">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty-state">
                  Nenhum cliente cadastrado.
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

      <!-- Modal de Cadastro / Edição -->
      <app-modal-dialog
        [isOpen]="exibirModal"
        [title]="editandoId ? 'Editar Cliente' : 'Novo Cliente'"
        (close)="exibirModal = false"
      >
        <form (ngSubmit)="salvar()">
          <div class="form-group">
            <label class="form-label" for="cli-nome">Nome</label>
            <input type="text" [(ngModel)]="formCliente.nome" id="cli-nome" name="nome" required placeholder="Nome completo ou razão social" class="form-control" />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="cli-tipo">Tipo de Pessoa</label>
              <app-custom-select
                [options]="tipoDocumentoOptions"
                [value]="formCliente.tipoDocumento || 'CPF'"
                [disabled]="!!editandoId"
                idGatilho="cli-tipo"
                placeholder="Selecione o Tipo"
                (valueChange)="formCliente.tipoDocumento = $any($event)"
              ></app-custom-select>
            </div>

            <div class="form-group">
              <label class="form-label" for="cli-documento">CPF / CNPJ</label>
              <input
                type="text"
                [(ngModel)]="formCliente.documento"
                id="cli-documento" name="documento"
                appMask="cpfCnpj"
                required
                [disabled]="!!editandoId"
                placeholder="000.000.000-00"
                class="form-control"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="cli-email">E-mail</label>
              <input type="email" [(ngModel)]="formCliente.email" id="cli-email" name="email" required placeholder="cliente@email.com" class="form-control" />
            </div>

            <div class="form-group">
              <label class="form-label" for="cli-telefone">Telefone</label>
              <input type="text" [(ngModel)]="formCliente.telefone" id="cli-telefone" name="telefone" appMask="telefone" required placeholder="(11) 99999-9999" class="form-control" />
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" (click)="exibirModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Cliente</button>
          </div>
        </form>
      </app-modal-dialog>
    </app-page-container>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .page-title { display: flex; align-items: center; gap: 0.5rem; }
  `]
})
export class ClientesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  clientes: Cliente[] = [];
  exibirModal = false;
  editandoId: string | null = null;

  tipoDocumentoOptions: SelectOption[] = [
    { value: 'CPF', label: 'Pessoa Física (CPF)' },
    { value: 'CNPJ', label: 'Pessoa Jurídica (CNPJ)' }
  ];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  formCliente: Cliente = {
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    tipoDocumento: 'CPF',
  };

  loading = false;
  private readonly clienteService = inject(ClienteService);
  private readonly notification = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.clienteService.getAll(this.pageNumber, this.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.clientes = res.items || [];
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
    this.formCliente = { nome: '', email: '', telefone: '', documento: '', tipoDocumento: 'CPF' };
    this.exibirModal = true;
  }

  editar(c: Cliente) {
    this.editandoId = c.id || null;
    this.formCliente = { ...c };
    this.exibirModal = true;
  }

  salvar() {
    if (this.editandoId) {
      this.clienteService.atualizar(this.editandoId, this.formCliente).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.success('Cliente Atualizado', 'Dados do cliente salvos com sucesso.');
          this.exibirModal = false;
          this.carregar();
        }
      });
    } else {
      this.clienteService.criar(this.formCliente).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.success('Cliente Cadastrado', 'Novo cliente incluído no sistema.');
          this.exibirModal = false;
          this.carregar();
        }
      });
    }
  }

  excluir(id: string) {
    if (confirm('Deseja remover este cliente?')) {
      this.clienteService.excluir(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.info('Cliente Removido', 'Cadastro excluído.');
          this.carregar();
        }
      });
    }
  }
}
