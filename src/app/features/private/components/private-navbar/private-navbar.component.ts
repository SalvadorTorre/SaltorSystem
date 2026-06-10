import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';
import { environment } from '@env/environment';

type NavbarUpdateStage =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

@Component({
  selector: 'private-navbar',
  templateUrl: './private-navbar.component.html',
  styleUrls: ['./private-navbar.component.css'],
})
export class PrivateNavbarComponent implements OnInit {
  @Input() initials: string = '';
  @Input() personName: string = '';
  @Input() isDesktopApp: boolean = false;
  @Input() updateStage: NavbarUpdateStage = 'idle';
  @Input() updateMessage: string = '';
  @Input() updateVersionLabel: string = '';
  @Input() updateProgressLabel: string = '';
  @Output() profileRequested = new EventEmitter<void>();
  @Output() aboutRequested = new EventEmitter<void>();
  @Output() checkUpdatesRequested = new EventEmitter<void>();
  @Output() installUpdateRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();
  readonly appVersion = environment.appVersion || '1.0.0';

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

  emitCheckUpdates(): void {
    this.checkUpdatesRequested.emit();
  }

  emitInstallUpdate(): void {
    this.installUpdateRequested.emit();
  }

  emitLogout(): void {
    this.logoutRequested.emit();
  }

  get hasDownloadedUpdate(): boolean {
    return this.updateStage === 'downloaded';
  }

  get isCheckingUpdates(): boolean {
    return this.updateStage === 'checking' || this.updateStage === 'downloading';
  }

  get updateActionLabel(): string {
    if (this.updateStage === 'checking') return 'Buscando actualizaciones...';
    if (this.updateStage === 'downloading') {
      return this.updateProgressLabel || 'Descargando actualización...';
    }
    if (this.updateStage === 'downloaded') return 'Actualización lista para instalar';
    if (this.updateStage === 'not-available') return 'No hay actualizaciones disponibles';
    if (this.updateStage === 'error') return 'Reintentar búsqueda de actualización';
    if (this.updateStage === 'unsupported') return 'Actualizaciones no disponibles aquí';
    return 'Buscar actualizaciones';
  }

  canViewModule(prefix: string): boolean {
    return this.access.canViewModule(prefix);
  }
}
