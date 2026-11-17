import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VeiculoService } from '../../services/veiculo.service';
import { ClienteService } from '../../../clientes/services/cliente.service';
import { Veiculo } from '../../models/veiculo.model';
import { Cliente } from '../../../clientes/models/cliente.model';
import { MaskDirective } from '../../../../shared/directives/mask.directive';
import { NotificationService } from '../../../../core/ui/notification.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { PlacaBadgeComponent } from '../../../../shared/components/placa-badge/placa-badge.component';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { CpfCnpjPipe } from '../../../../shared/pipes/cpf-cnpj.pipe';

@Component({
  selector: 'app-veiculos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MaskDirective,
    PaginationComponent,
    CustomSelectComponent,
    PageContainerComponent,
    PlacaBadgeComponent,
    ModalDialogComponent
  ],
  template: `
    <app-page-container>
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.3"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3C2 11.3 2 11.7 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            Veículos
          </h1>
        </div>
        <button type="button" (click)="abrirModalNovo()" class="btn btn-primary">
          + Veículo
        </button>
      </div>

      <!-- Tabela de Veículos -->
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
              <th>Placa</th>
              <th>Modelo / Marca</th>
              <th>Ano Fab / Mod</th>
              <th>Proprietário</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (v of veiculos; track v.id) {
              <tr>
                <td>
                  <app-placa-badge [placa]="v.placa"></app-placa-badge>
                </td>
                <td style="font-weight: 600;">
                  {{ v.modelo }} <span class="text-muted" style="font-weight: 400;">({{ v.marca }})</span>
                </td>
                <td>{{ v.anoFabricacao }} / {{ v.anoModelo }}</td>
                <td>{{ getClienteNome(v.clienteId) }}</td>
                <td class="col-acoes">
                  <div class="acoes-linha">
                    <button type="button" (click)="editar(v)" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'Editar ' + (v.placa || v.modelo)" [title]="'Editar ' + (v.placa || v.modelo)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button type="button" (click)="excluir(v.id!)" class="btn btn-ghost btn-danger btn-icon btn-sm" [attr.aria-label]="'Excluir ' + (v.placa || v.modelo)" [title]="'Excluir ' + (v.placa || v.modelo)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty-state">
                  Nenhum veículo cadastrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div style="margin-top: 1rem;">
        <app-pagination
          [pageNumber]="pageNumber"
          [pageSize]="pageSize"
          [totalItems]="totalItems"
          [totalPages]="totalPages"
          [pageSizeOptions]="[5, 10, 20, 50]"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal de Cadastro / Edição -->
      <app-modal-dialog
        [isOpen]="exibirModal"
        [title]="editandoId ? 'Editar Veículo' : 'Novo Veículo'"
        (close)="exibirModal = false"
      >
        <form (ngSubmit)="salvar()">
          <div class="form-group">
            <label class="form-label" for="vei-cliente">Cliente Proprietário</label>
            <app-custom-select
              [options]="clienteOptions"
              [value]="formVeiculo.clienteId || ''"
              [disabled]="!!editandoId"
              idGatilho="vei-cliente"
              placeholder="Selecione o proprietário"
              placeholderBusca="Nome ou documento"
              [loading]="loadingClientes"
              (valueChange)="formVeiculo.clienteId = $event"
            ></app-custom-select>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="vei-marca">Marca</label>
              <input type="text" [(ngModel)]="formVeiculo.marca" id="vei-marca" name="marca" required placeholder="Ex: Chevrolet" class="form-control" />
            </div>

            <div class="form-group">
              <label class="form-label" for="vei-modelo">Modelo</label>
              <input type="text" [(ngModel)]="formVeiculo.modelo" id="vei-modelo" name="modelo" required placeholder="Ex: Onix" class="form-control" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="vei-placa">Placa</label>
              <input
                type="text"
                [(ngModel)]="formVeiculo.placa"
                id="vei-placa" name="placa"
                appMask="placa"
                required
                [disabled]="!!editandoId"
                placeholder="ABC-1234 / ABC1D23"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="vei-chassi">Chassi (17 caracteres)</label>
              <input
                type="text"
                [(ngModel)]="formVeiculo.chassi"
                id="vei-chassi" name="chassi"
                maxlength="17"
                required
                [disabled]="!!editandoId"
                placeholder="Ex: 9BWZZZ377VT004251"
                class="form-control"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="vei-renavam">Renavam (11 dígitos)</label>
              <input
                type="text"
                [(ngModel)]="formVeiculo.renavam"
                id="vei-renavam" name="renavam"
                maxlength="11"
                required
                [disabled]="!!editandoId"
                placeholder="Ex: 00123456789"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="vei-ano-fab">Ano Fabricação</label>
              <input type="number" [(ngModel)]="formVeiculo.anoFabricacao" id="vei-ano-fab" name="anoFabricacao" required placeholder="Ex: 2022" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="vei-ano-mod">Ano Modelo</label>
            <input type="number" [(ngModel)]="formVeiculo.anoModelo" id="vei-ano-mod" name="anoModelo" required placeholder="Ex: 2023" class="form-control" />
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" (click)="exibirModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Veículo</button>
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
export class VeiculosPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  veiculos: Veiculo[] = [];
  clientes: Cliente[] = [];
  clienteOptions: SelectOption[] = [];
  loadingClientes = false;
  exibirModal = false;
  editandoId: string | null = null;

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  formVeiculo: Veiculo = {
    placa: '',
    marca: '',
    modelo: '',
    anoFabricacao: new Date().getFullYear(),
    anoModelo: new Date().getFullYear(),
    chassi: '',
    renavam: '',
    clienteId: ''
  };

  loading = false;
  private readonly veiculoService = inject(VeiculoService);
  private readonly clienteService = inject(ClienteService);
  private readonly notification = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cpfCnpj = new CpfCnpjPipe();

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.veiculoService.getAll(this.pageNumber, this.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.veiculos = res.items || [];
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
    this.loadingClientes = true;
    this.clienteService.getAll(1, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.clientes = res.items || [];
        this.clienteOptions = this.clientes.map(c => ({
          value: c.id!,
          label: c.nome,
          descricao: this.cpfCnpj.transform(c.documento),
          palavrasChave: c.documento
        }));
        this.loadingClientes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingClientes = false;
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

  getClienteNome(id: string): string {
    return this.clientes.find(c => c.id === id)?.nome || 'Desconhecido';
  }

  abrirModalNovo() {
    this.editandoId = null;
    this.formVeiculo = {
      placa: '',
      marca: '',
      modelo: '',
      anoFabricacao: new Date().getFullYear(),
      anoModelo: new Date().getFullYear(),
      chassi: '',
      renavam: '',
      clienteId: ''
    };
    this.exibirModal = true;
  }

  editar(v: Veiculo) {
    this.editandoId = v.id || null;
    this.formVeiculo = { ...v };
    this.exibirModal = true;
  }

  salvar() {
    if (this.editandoId) {
      this.veiculoService.atualizar(this.editandoId, this.formVeiculo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.success('Veículo Atualizado', 'Dados do veículo salvos.');
          this.exibirModal = false;
          this.carregar();
        }
      });
    } else {
      this.veiculoService.criar(this.formVeiculo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.success('Veículo Cadastrado', 'Novo veículo incluído na frota.');
          this.exibirModal = false;
          this.carregar();
        }
      });
    }
  }

  excluir(id: string) {
    if (confirm('Deseja remover este veículo?')) {
      this.veiculoService.excluir(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.notification.info('Veículo Removido', 'Cadastro excluído.');
          this.carregar();
        }
      });
    }
  }
}
