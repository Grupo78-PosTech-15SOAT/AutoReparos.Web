import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalDialogComponent } from './modal-dialog.component';

describe('ModalDialogComponent', () => {
  let fixture: ComponentFixture<ModalDialogComponent>;
  let component: ModalDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('não deve renderizar quando isOpen for falso', () => {
    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeNull();
  });

  it('deve renderizar título quando isOpen for verdadeiro', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Modal de Teste');
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeTruthy();

    const titleEl = fixture.nativeElement.querySelector('.modal-title');
    expect(titleEl.textContent.trim()).toBe('Modal de Teste');
  });

  it('deve disparar evento de fechamento ao clicar no botão fechar', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const btnClose = fixture.nativeElement.querySelector('.btn-close');
    expect(btnClose).toBeTruthy();
    btnClose.click();
    fixture.detectChanges();

    expect(closed).toBe(true);
  });

  it('deve disparar evento de fechamento ao clicar no backdrop overlay', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeTruthy();
    overlay.click();
    fixture.detectChanges();

    expect(closed).toBe(true);
  });

  it('deve disparar evento de fechamento ao pressionar a tecla Escape', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(closed).toBe(true);
  });
});
