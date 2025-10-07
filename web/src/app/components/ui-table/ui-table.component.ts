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
  @Input() rows: Array<Record<string, unknown>> = [];

  trackByIndex = (i: number) => i;
  trackByRow = (_: number, r: any) => JSON.stringify(r); // per dataset piccolo va bene. Per dataset grandi, usare un id.

  // Converte il valore di cella in stringa/numero gestendo NamedEntity e fallback.
  displayValue(value: unknown): string | number {
    if (value == null) return '';
    if (typeof value === 'object') {
      const maybeName = (value as { name?: unknown }).name;
      if (typeof maybeName === 'string') return maybeName;
      return JSON.stringify(value);
    }
    if (typeof value === 'number' || typeof value === 'string') return value;
    return String(value);
  }
}
