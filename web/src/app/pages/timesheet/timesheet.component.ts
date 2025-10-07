import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, map, startWith } from 'rxjs';
import { GroupKey, TimesheetEntry } from '../../model/model';
import { TimesheetService } from '../../service/timesheet.service';
import { UiTableComponent } from '../../components/ui-table/ui-table.component';
import { GroupFiltersComponent } from '../../components/group-filters/group-filters.component';
import { buildViewModel } from '../../utils/aggregations';

@Component({
  selector: 'app-timesheet-page',
  standalone: true,
  imports: [CommonModule, UiTableComponent, GroupFiltersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timesheet.component.html',
  styleUrl: './timesheet.component.scss',
})
export class TimesheetPageComponent {
  private timesheetService = inject(TimesheetService);

  // Memorizza le selezioni di raggruppamento correnti provenienti dai filtri
  private group1Subject = new BehaviorSubject<GroupKey | null>(null);
  private group2Subject = new BehaviorSubject<GroupKey | null>(null);

  group1$ = this.group1Subject.asObservable();
  group2$ = this.group2Subject.asObservable();

  // Ricostruisce il view model della tabella quando cambiano dati o criteri di gruppo
  readonly vm$ = combineLatest([
    this.timesheetService.getActivities().pipe(startWith([] as TimesheetEntry[])),
    this.group1$, this.group2$,
  ]).pipe(
    map(([data, g1, g2]) => {
      // Ignora i gruppi non selezionati così l'aggregatore usa solo le dimensioni attive
      const groups = [g1, g2].filter((x): x is GroupKey => !!x);
      return buildViewModel(data, groups);
    })
  );

  setGroup1(v: GroupKey | null) { this.group1Subject.next(v); }
  setGroup2(v: GroupKey | null) { this.group2Subject.next(v); }
}
