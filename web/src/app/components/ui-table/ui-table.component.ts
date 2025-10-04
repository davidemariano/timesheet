import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-table.component.html',
  styleUrl: './ui-table.component.scss'
})
export class UiTableComponent {
  @Input() columns: string[] = [];
  @Input() headers: Record<string, string> = {};
  @Input() rows: Array<Record<string, string | number>> = [];

  trackByIndex = (i: number) => i;
  trackByRow = (_: number, r: any) => JSON.stringify(r); // per dataset piccolo va bene. Per dataset grandi, usare un id.
}
