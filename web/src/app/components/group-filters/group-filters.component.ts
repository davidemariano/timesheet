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
  @Input() group1: GroupKey | null = null;
  @Input() group2: GroupKey | null = null;
  @Output() group1Change = new EventEmitter<GroupKey | null>();
  @Output() group2Change = new EventEmitter<GroupKey | null>();

  keys: GroupKey[] = ['project', 'employee', 'date'];
  labels: Record<GroupKey, string> = { project: 'Project', employee: 'Employee', date: 'Date' };

  onChangeGroup1(v: GroupKey | null) {
    this.group1Change.emit(v);
    // se il secondo è uguale al primo, azzero
    if (v && this.group2 === v) this.group2Change.emit(null);
  }
  onChangeGroup2(v: GroupKey | null) { this.group2Change.emit(v); }
  clear() { this.group1Change.emit(null); this.group2Change.emit(null); }
}
