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
  // Elenco delle colonne da renderizzare nell'ordine previsto
  @Input() columns: string[] = [];
  // Intestazioni visualizzate per ogni colonna (chiave -> etichetta)
  @Input() headers: Record<string, string> = {};
  // Dati tabellari: ogni riga è un record indicizzato dalla chiave della colonna
  @Input() rows: Array<Record<string, string | number>> = [];

  // Ottimizza ngFor sulle intestazioni mantenendo l'indice come chiave stabile
  trackByIndex = (i: number) => i;
  // Per dataset piccoli serializziamo la riga: per serie più grandi meglio fornire un id
  trackByRow = (_: number, r: any) => JSON.stringify(r);
}
