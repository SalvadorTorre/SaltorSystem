import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appPhoneNumberMask]'
})
export class PhoneNumberMaskDirective {

  constructor(private el: ElementRef) { }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    const input = event.target;
    const value = input.value.replace(/\D/g, '').slice(0, 10);

    if (value.length === 0) {
      input.value = '';
    } else if (value.length <= 3) {
      input.value = '(' + value;
    } else if (value.length <= 6) {
      input.value = '(' + value.slice(0, 3) + ')' + value.slice(3);
    } else {
      input.value = '(' + value.slice(0, 3) + ')'+ ' ' + value.slice(3, 6) + '-' + value.slice(6);
    }
  }
}
