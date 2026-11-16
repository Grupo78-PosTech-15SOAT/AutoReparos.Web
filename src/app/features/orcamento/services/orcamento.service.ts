import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { CriarOrcamentoRequest, OrcamentoCriadoResponse } from '../models/orcamento.model';

@Injectable({
  providedIn: 'root'
})
export class OrcamentoService {
  private readonly http = inject(HttpClient);

  criar(req: CriarOrcamentoRequest): Observable<OrcamentoCriadoResponse> {
    return this.http.post<OrcamentoCriadoResponse>(API_ENDPOINTS.ORCAMENTOS.BASE, req);
  }
}
