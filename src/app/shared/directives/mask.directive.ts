import { Directive, HostListener, input, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appMask]',
  standalone: true
})
export class MaskDirective {
  maskType = input<'cpf' | 'cnpj' | 'cpfCnpj' | 'placa' | 'telefone'>('cpfCnpj', { alias: 'appMask' });
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  @HostListener('input', ['$event'])
  onInputChange(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const value = this.applyMask(inputEl.value, this.maskType());

    if (this.ngControl?.control) {
      this.ngControl.control.setValue(value, { emitEvent: false });
    }
  }

  private applyMask(value: string, type: string): string {
    if (type === 'placa') {
      return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    } else if (type === 'cpf' || (type === 'cpfCnpj' && value.replace(/\D/g, '').length <= 11)) {
      const nums = value.replace(/\D/g, '').slice(0, 11);
      if (nums.length <= 3) return nums;
      if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
      if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
      return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
    } else if (type === 'cnpj' || (type === 'cpfCnpj' && value.replace(/\D/g, '').length > 11)) {
      const nums = value.replace(/\D/g, '').slice(0, 14);
      if (nums.length <= 2) return nums;
      if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`;
      if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
      if (nums.length <= 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12, 14)}`;
    } else if (type === 'telefone') {
      const nums = value.replace(/\D/g, '').slice(0, 11);
      if (nums.length <= 2) return nums;
      if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
      if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
      return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
    }

    if (this.ngControl?.control) {
      this.ngControl.control.setValue(value, { emitEvent: false });
    }
    
    return value;
  }
}
