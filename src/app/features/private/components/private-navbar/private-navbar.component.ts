import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';

@Component({
  selector: 'private-navbar',
  templateUrl: './private-navbar.component.html',
  styleUrls: ['./private-navbar.component.css'],
})
export class PrivateNavbarComponent implements OnInit {
  @Input() initials: string = '';
  @Input() personName: string = '';
  @Output() profileRequested = new EventEmitter<void>();
  @Output() aboutRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  constructor(private readonly access: AccessControlService) {}

  ngOnInit(): void {
    void this.access.ensureLoaded();
  }

  emitProfile(): void {
    this.profileRequested.emit();
  }

  emitAbout(): void {
    this.aboutRequested.emit();
  }

  emitLogout(): void {
    this.logoutRequested.emit();
  }

  canViewModule(prefix: string): boolean {
    return this.access.canViewModule(prefix);
  }
}
