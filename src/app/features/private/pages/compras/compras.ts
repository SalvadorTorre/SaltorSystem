import { Component, OnInit } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';

@Component({
  selector: 'app-compras',
  templateUrl: './compras.html',
  styleUrls: ['./compras.css'],
})
export class ComprasComponent implements OnInit {
  constructor(private readonly access: AccessControlService) {}

  ngOnInit(): void {
    void this.access.ensureLoaded();
  }

  canView(path: string): boolean {
    return this.access.canViewPath(path);
  }
}
