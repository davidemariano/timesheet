import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupKey } from '../../model/model';

@Component({
  selector: 'group-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./group-filters.component.html", 
  styleUrls: ['./group-filters.component.scss'],
})
export class GroupFiltersComponent {
  // Valori selezionati esternamente per i due livelli di raggruppamento
  @Input() group1: GroupKey | null = null;
  @Input() group2: GroupKey | null = null;
  // Notifica al componente padre ogni modifica ai raggruppamenti
  @Output() group1Change = new EventEmitter<GroupKey | null>();
  @Output() group2Change = new EventEmitter<GroupKey | null>();

  // Opzioni disponibili per i menu a tendina e relative etichette.
  keys: GroupKey[] = ['project', 'employee', 'date'];
  labels: Record<GroupKey, string> = { project: 'Project', employee: 'Employee', date: 'Date' };

  // Gestisce la selezione del primo raggruppamento, garantendo coerenza con il secondo
  onChangeGroup1(v: GroupKey | null) {
    if (v == null) {
      this.onChangeGroup2(null);
      this.group2Change.emit(null);
    }
    this.group1Change.emit(v);
    // Se i due livelli coincidono, azzeriamo il secondo per evitare duplicati
    if (v && this.group2 === v) this.group2Change.emit(null);
  }
  // Propaga la modifica del secondo livello di raggruppamento
  onChangeGroup2(v: GroupKey | null) { this.group2Change.emit(v); }
  // Reset simultaneo di entrambi i campi
  clear() { this.group1Change.emit(null); this.group2Change.emit(null); }
}
