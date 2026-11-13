import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdemServicoService } from '../../../ordens-servico/services/ordem-servico.service';
import { OsConsulta } from '../../../ordens-servico/models/ordem-servico.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PageContainerComponent } from '../../../../shared/components/page-container/page-container.component';
import { IdBadgeComponent } from '../../../../shared/components/id-badge/id-badge.component';

@Component({
  selector: 'app-consulta-publica-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, StatusBadgeComponent, PageContainerComponent, IdBadgeComponent],
  template: `
    <app-page-container maxWidth="850px" style="padding-top: 3rem; display: block;">
      <div class="public-banner">
        <div class="brand-badge">Portal do Cliente</div>
        <h1 class="public-title">Consulta de Ordem de Serviço</h1>
        <p class="public-desc">Informe o código da sua OS para acompanhar o status e o histórico.</p>

        <form (ngSubmit)="consultar()" class="search-input-wrapper">
          <input
            type="text"
            [(ngModel)]="codigo"
            name="codigo"
            placeholder="Código da OS"
            class="form-control search-input"
            aria-label="Código da OS"
          />
          <button type="submit" [disabled]="carregando() || !codigo.trim()" class="btn btn-primary search-btn">
            Buscar por código
          </button>
        </form>
      </div>

      @if (carregando()) {
        <div class="card-panel empty-card" role="status">Buscando informações...</div>
      } @else if (naoEncontrada()) {
        <div class="card-panel empty-card" role="alert">
          <h3 class="empty-title">Nenhuma OS encontrada</h3>
          <p class="empty-text">Verifique o código informado e tente novamente.</p>
        </div>
      } @else if (os(); as consulta) {
        <div class="card-panel">
          <div class="os-header">
            <app-id-badge [text]="'OS #' + consulta.id"></app-id-badge>
            <app-status-badge [status]="consulta.status"></app-status-badge>
          </div>
          <h3 class="box-title">Histórico</h3>
          <ul class="historico">
            @for (h of consulta.historico; track $index) {
              <li class="historico-item">
                <app-status-badge [status]="h.status" size="sm"></app-status-badge>
                <span class="historico-data">{{ h.em | date:'dd/MM/yyyy HH:mm' }}</span>
              </li>
            } @empty {
              <li class="historico-item">Sem movimentações registradas.</li>
            }
          </ul>
        </div>
      }
    </app-page-container>
  `,
  styles: [`
    .public-banner {
      background: rgba(24, 24, 28, 0.9);
      border: 1px solid rgba(237, 20, 91, 0.3);
      border-radius: 16px;
      padding: 2.5rem 2.25rem;
      text-align: center;
      margin-bottom: 2rem;
    }
    .brand-badge {
      display: inline-block;
      background: rgba(237, 20, 91, 0.15);
      color: #ED145B;
      border: 1px solid rgba(237, 20, 91, 0.4);
      padding: 0.3rem 0.85rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .public-title { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: #fff; }
    .public-desc { color: #A1A1AA; font-size: 0.95rem; margin: 0.5rem auto 1.5rem; }
    .search-input-wrapper { display: flex; gap: 0.75rem; flex-wrap: wrap; max-width: 620px; margin: 0 auto; }
    .search-input { flex: 1; min-width: 240px; padding: 0.8rem 1.1rem; }
    .search-btn { padding: 0.8rem 1.4rem; }
    .os-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .box-title { font-size: 0.9rem; font-weight: 600; color: #ED145B; margin-bottom: 0.5rem; }
    .historico { list-style: none; margin: 0; padding: 0; }
    .historico-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .historico-data { color: #A1A1AA; font-size: 0.85rem; }
    .empty-card { text-align: center; padding: 2.5rem; color: #A1A1AA; }
    .empty-title { font-family: 'Outfit', sans-serif; color: #fff; }
  `]
})
export class ConsultaPublicaPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osService = inject(OrdemServicoService);

  codigo = '';
  readonly carregando = signal(false);
  readonly naoEncontrada = signal(false);
  readonly os = signal<OsConsulta | null>(null);

  consultar() {
    const codigo = this.codigo.trim();
    if (!codigo) return;

    this.carregando.set(true);
    this.naoEncontrada.set(false);
    this.os.set(null);
    this.osService.consultar(codigo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.os.set(res);
        this.carregando.set(false);
      },
      error: () => {
        this.naoEncontrada.set(true);
        this.carregando.set(false);
      }
    });
  }
}
