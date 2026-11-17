import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertBannerComponent } from './alert-banner.component';

describe('AlertBannerComponent', () => {
  let fixture: ComponentFixture<AlertBannerComponent>;
  let component: AlertBannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertBannerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve renderizar título e mensagem padrão', () => {
    fixture.componentRef.setInput('tipo', 'info');
    fixture.componentRef.setInput('titulo', 'Título Informativo');
    fixture.componentRef.setInput('mensagem', 'Mensagem de teste');
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.alert-banner');
    expect(banner).toBeTruthy();
    expect(banner.classList.contains('tipo-info')).toBe(true);

    const titleEl = fixture.nativeElement.querySelector('.alert-title');
    expect(titleEl.textContent.trim()).toBe('Título Informativo');

    const messageEl = fixture.nativeElement.querySelector('.alert-message');
    expect(messageEl.textContent.trim()).toBe('Mensagem de teste');
  });

  it('deve aplicar as classes corretas conforme o tipo', () => {
    fixture.componentRef.setInput('tipo', 'erro');
    fixture.detectChanges();
    const bannerErro = fixture.nativeElement.querySelector('.alert-banner');
    expect(bannerErro.classList.contains('tipo-erro')).toBe(true);

    fixture.componentRef.setInput('tipo', 'sucesso');
    fixture.detectChanges();
    const bannerSucesso = fixture.nativeElement.querySelector('.alert-banner');
    expect(bannerSucesso.classList.contains('tipo-sucesso')).toBe(true);

    fixture.componentRef.setInput('tipo', 'aviso');
    fixture.detectChanges();
    const bannerAviso = fixture.nativeElement.querySelector('.alert-banner');
    expect(bannerAviso.classList.contains('tipo-aviso')).toBe(true);
  });

  it('deve emitir evento de dismiss quando dismissible for verdadeiro e botão for clicado', () => {
    let dismissed = false;
    component.dismiss.subscribe(() => {
      dismissed = true;
    });

    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();

    const dismissBtn = fixture.nativeElement.querySelector('.alert-dismiss');
    expect(dismissBtn).toBeTruthy();

    dismissBtn.click();
    fixture.detectChanges();

    expect(dismissed).toBe(true);
  });
});
