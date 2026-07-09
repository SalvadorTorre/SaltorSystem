import { Component, OnInit } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';

@Component({
  selector: 'Contabilidad',
  templateUrl: './contabilidad.html',
  styleUrls: ['./contabilidad.css']
})
export class Contabilidad implements OnInit {
  constructor(private readonly access: AccessControlService) {}

  ngOnInit(): void {
    void this.access.ensureLoaded();
  }

  canView(path: string): boolean {
    return this.access.canViewPath(path);
  }
}
