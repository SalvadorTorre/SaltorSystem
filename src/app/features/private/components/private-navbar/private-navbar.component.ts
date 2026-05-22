import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'private-navbar',
  templateUrl: './private-navbar.component.html',
  styleUrls: ['./private-navbar.component.css'],
})
export class PrivateNavbarComponent {
  @Input() initials: string = '';
  @Input() personName: string = '';
  @Output() profileRequested = new EventEmitter<void>();
  @Output() aboutRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  emitProfile(): void {
    this.profileRequested.emit();
  }

  emitAbout(): void {
    this.aboutRequested.emit();
  }

  emitLogout(): void {
    this.logoutRequested.emit();
  }
}
