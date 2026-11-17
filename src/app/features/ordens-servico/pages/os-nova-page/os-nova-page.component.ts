import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrdemServicoService } from '../../services/ordem-servico.service';
import { ClienteService } from '../../../clientes/services/cliente.service';
import { VeiculoService } from '../../../veiculos/services/veiculo.service';
import { Cliente } from '../../../clientes/models/cliente.model';
import { Veiculo } from '../../../veiculos/models/veiculo.model';
import { NotificationService } from '../../../../core/ui/notification.service';
import { MENSAGENS_POR_STATUS, mensagemDoCodigo } from '../../../../core/http/error-catalog';
import {
  CustomSelectComponent,
  SelectOption,
} from '../../../../shared/components/custom-select/custom-select.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { STORAGE_TOKEN } from '../../../../core/tokens/storage.token';
import { OsJornadaStore } from '../../../../core/store/os-jornada.store';

const DRAFT_STORAGE_KEY = 'autoreparos_draft_nova_os';

@Component({
  selector: 'app-os-nova-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CustomSelectComponent, PageContainerComponent],
  template: `
    <app-page-container maxWidth="800px">
      <div
        class="page-header"
        style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;"
      >
        <div>
          <h1 class="page-title">Nova Ordem de Serviço</h1>
        </div>
        @if (rascunhoSalvo) {
          <div class="draft-badge">Rascunho salvo</div>
        }
      </div>

      @if (loadingDados) {
        <div class="card-panel" role="status">Carregando clientes e veículos...</div>
      } @else {
        <div class="card-panel">
          <form (ngSubmit)="salvarOS()">
            <div class="form-section">
              <h3 class="section-heading">1. Cliente</h3>
              <div class="form-group">
                <label class="form-label">Cliente Cadastrado</label>
                <app-custom-select
                  [options]="clienteOptions"
                  [value]="clienteId"
                  placeholder="-- Selecione o Cliente --"
                  (valueChange)="onClienteSelect($event)"
                ></app-custom-select>
              </div>
            </div>

            <div class="form-section" style="margin-top: 1.5rem;">
              <h3 class="section-heading">2. Veículo</h3>
              <div class="form-group">
                <label class="form-label">Veículo do Cliente</label>
                <app-custom-select
                  [options]="veiculoOptions"
                  [value]="veiculoId"
                  placeholder="-- Selecione o Veículo --"
                  (valueChange)="onVeiculoSelect($event)"
                ></app-custom-select>
              </div>
            </div>

            <div class="form-section" style="margin-top: 1.5rem;">
              <h3 class="section-heading">3. Observação</h3>
              <div class="form-group">
                <label class="form-label" for="observacao-os">Observações iniciais</label>
                <textarea
                  id="observacao-os"
                  [(ngModel)]="observacao"
                  name="observacao"
                  (input)="salvarRascunho()"
                  rows="4"
                  placeholder="Sintomas relatados pelo cliente..."
                  class="form-control"
                ></textarea>
              </div>
            </div>

            @if (erroFormulario) {
              <p class="erro-formulario" role="alert">{{ erroFormulario }}</p>
            }

            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
              <button type="button" (click)="cancelar()" class="btn btn-secondary">Cancelar</button>
              <button
                type="submit"
                [disabled]="loading || !clienteId || !veiculoId"
                class="btn btn-primary"
              >
                {{ loading ? 'Abrindo...' : 'Abrir OS' }}
              </button>
            </div>
          </form>
        </div>
      }
    </app-page-container>
  `,
  styles: [
    `
      .form-section {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 1.5rem;
      }
      .section-heading {
        font-family: 'Outfit', sans-serif;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 1rem;
      }
      .draft-badge {
        font-size: 0.75rem;
        color: var(--status-recebida);
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        font-weight: 600;
        margin-top: 0.25rem;
      }
      .erro-formulario {
        margin-top: 1rem;
        color: var(--primary);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class OsNovaPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);
  private readonly clienteService = inject(ClienteService);
  private readonly veiculoService = inject(VeiculoService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly storage = inject(STORAGE_TOKEN);
  private readonly osJornadaStore = inject(OsJornadaStore);
  private readonly cdr = inject(ChangeDetectorRef);

  clienteId = '';
  veiculoId = '';
  observacao = '';
  erroFormulario: string | null = null;

  clientes: Cliente[] = [];
  todosVeiculos: Veiculo[] = [];
  veiculosFiltrados: Veiculo[] = [];

  clienteOptions: SelectOption[] = [];
  veiculoOptions: SelectOption[] = [];

  loading = false;
  loadingDados = true;
  rascunhoSalvo = false;

  ngOnInit() {
    this.carregarDados();
    this.carregarRascunho();
  }

  carregarDados() {
    this.loadingDados = true;
    let clientesCarregados = false;
    let veiculosCarregados = false;

    const checarConcluido = () => {
      if (clientesCarregados && veiculosCarregados) {
        this.loadingDados = false;
        this.cdr.markForCheck();
      }
    };

    this.clienteService
      .getAll(1, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.clientes = res.items || [];
          this.clienteOptions = this.clientes.map(c => ({
            value: c.id!,
            label: c.nome,
          }));
          clientesCarregados = true;
          checarConcluido();
        },
        error: () => {
          clientesCarregados = true;
          checarConcluido();
        },
      });

    this.veiculoService
      .getAll(1, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const data = res.items || [];
          this.todosVeiculos = data;
          this.veiculosFiltrados = data;
          this.atualizarVeiculoOptions();
          veiculosCarregados = true;
          checarConcluido();
        },
        error: () => {
          veiculosCarregados = true;
          checarConcluido();
        },
      });
  }

  atualizarVeiculoOptions() {
    this.veiculoOptions = this.veiculosFiltrados.map(v => ({
      value: v.id!,
      label: `${v.modelo} (${v.marca})`,
    }));
  }

  salvarRascunho() {
    if (this.clienteId || this.veiculoId || this.observacao) {
      const draft = {
        clienteId: this.clienteId,
        veiculoId: this.veiculoId,
        observacao: this.observacao,
      };
      this.storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      this.rascunhoSalvo = true;
    }
  }

  carregarRascunho() {
    const json = this.storage.getItem(DRAFT_STORAGE_KEY);
    if (json) {
      try {
        const draft = JSON.parse(json);
        this.clienteId = draft.clienteId || '';
        this.veiculoId = draft.veiculoId || '';
        this.observacao = draft.observacao || '';
        this.rascunhoSalvo = true;
      } catch {
        this.storage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }

  limparRascunho() {
    this.storage.removeItem(DRAFT_STORAGE_KEY);
    this.rascunhoSalvo = false;
  }

  onClienteSelect(id: string) {
    this.clienteId = id;
    this.erroFormulario = null;
    this.onClienteChange();
    this.salvarRascunho();
  }

  onVeiculoSelect(id: string) {
    this.veiculoId = id;
    this.erroFormulario = null;
    this.salvarRascunho();
  }

  onClienteChange() {
    if (this.clienteId) {
      this.veiculosFiltrados = this.todosVeiculos.filter(v => v.clienteId === this.clienteId);
      if (this.veiculosFiltrados.length === 1 && this.veiculosFiltrados[0].id) {
        this.veiculoId = this.veiculosFiltrados[0].id;
      } else {
        this.veiculoId = '';
      }
    } else {
      this.veiculosFiltrados = this.todosVeiculos;
    }
    this.atualizarVeiculoOptions();
  }

  salvarOS() {
    if (!this.clienteId || !this.veiculoId) {
      this.erroFormulario = 'Selecione o cliente e o veículo para abrir a OS.';
      this.notification.warning('Atenção', 'Selecione o Cliente e o Veículo para abrir a OS.');
      return;
    }

    this.loading = true;
    this.erroFormulario = null;
    const observacao = this.observacao.trim();
    this.osService
      .criar({
        clienteId: this.clienteId,
        veiculoId: this.veiculoId,
        ...(observacao ? { observacao } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: osCriada => {
          this.loading = false;
          this.limparRascunho();
          this.osJornadaStore.salvar({
            osId: osCriada.id,
            clienteId: this.clienteId,
            veiculoId: this.veiculoId,
          });
          this.notification.success(
            'OS Aberta!',
            `Ordem de Serviço #${osCriada.id.slice(0, 8)} registrada.`
          );
          this.cdr.markForCheck();
          this.router.navigate(['/ordens-servico', osCriada.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          const generica =
            MENSAGENS_POR_STATUS[err.status]?.mensagem ?? 'Não foi possível abrir a OS.';
          this.erroFormulario = mensagemDoCodigo(
            err.error?.codigo,
            err.error?.mensagem ?? generica
          );
          this.cdr.markForCheck();
        },
      });
  }

  cancelar() {
    this.limparRascunho();
    this.router.navigate(['/ordens-servico/fila']);
  }
}
