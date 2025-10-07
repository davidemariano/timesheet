import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subscription, combineLatest, map, startWith, tap } from 'rxjs';
import { GroupKey, NamedEntity, TimesheetEntry } from '../../model/model';
import { CreateActivityRequest, TimesheetService } from '../../service/timesheet.service';
import { UiTableComponent } from '../../components/ui-table/ui-table.component';
import { GroupFiltersComponent } from '../../components/group-filters/group-filters.component';
import { buildViewModel } from '../../utils/aggregations';

@Component({
  selector: 'app-timesheet-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiTableComponent, GroupFiltersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timesheet.component.html',
  styleUrl: './timesheet.component.scss',
})
export class TimesheetPageComponent implements OnDestroy {
  private timesheetService = inject(TimesheetService);
  private fb = inject(FormBuilder);

  private subscriptions = new Subscription();
  private projectIndex = new Map<number, NamedEntity>();
  private employeeIndex = new Map<number, NamedEntity>();

  private group1Subject = new BehaviorSubject<GroupKey | null>(null);
  private group2Subject = new BehaviorSubject<GroupKey | null>(null);

  group1$ = this.group1Subject.asObservable();
  group2$ = this.group2Subject.asObservable();

  readonly activities$ = this.timesheetService.getActivities();

  readonly projects$: Observable<NamedEntity[]> = this.activities$.pipe(
    map(entries => this.distinctNamedEntities(entries.map(e => e.project))),
    tap(list => this.projectIndex = new Map(list.map(item => [item.id, item])))
  );

  readonly employees$: Observable<NamedEntity[]> = this.activities$.pipe(
    map(entries => this.distinctNamedEntities(entries.map(e => e.employee))),
    tap(list => this.employeeIndex = new Map(list.map(item => [item.id, item])))
  );

  readonly vm$ = combineLatest([
    this.activities$.pipe(startWith([] as TimesheetEntry[])),
    this.group1$, this.group2$,
  ]).pipe(
    map(([data, g1, g2]) => {
      const groups = [g1, g2].filter((x): x is GroupKey => !!x);
      return buildViewModel(data, groups);
    })
  );

  readonly addForm = this.fb.group({
    projectChoice: ['', Validators.required],
    projectName: [''],
    employeeChoice: ['', Validators.required],
    employeeName: [''],
    date: ['', Validators.required],
    hours: [null as number | null, [Validators.required, Validators.min(0.25)]],
  });

  isAddModalOpen = false;
  isSubmitting = false;
  submitError: string | null = null;

  constructor() {
    this.subscriptions.add(
      this.addForm.get('projectChoice')!.valueChanges.subscribe(choice => {
        this.updateProjectNameValidators(choice);
      })
    );
    this.subscriptions.add(
      this.addForm.get('employeeChoice')!.valueChanges.subscribe(choice => {
        this.updateEmployeeNameValidators(choice);
      })
    );
    this.updateProjectNameValidators(this.addForm.get('projectChoice')!.value);
    this.updateEmployeeNameValidators(this.addForm.get('employeeChoice')!.value);
  }

  setGroup1(v: GroupKey | null) { this.group1Subject.next(v); }
  setGroup2(v: GroupKey | null) { this.group2Subject.next(v); }

  openAddModal() {
    const today = new Date().toISOString().slice(0, 10);
    this.addForm.reset({
      projectChoice: '',
      projectName: '',
      employeeChoice: '',
      employeeName: '',
      date: today,
      hours: null,
    });
    this.addForm.markAsPristine();
    this.addForm.markAsUntouched();
    this.submitError = null;
    this.isSubmitting = false;
    this.isAddModalOpen = true;
    this.updateProjectNameValidators(this.addForm.get('projectChoice')!.value);
    this.updateEmployeeNameValidators(this.addForm.get('employeeChoice')!.value);
  }

  closeAddModal() {
    this.isAddModalOpen = false;
  }

  get isProjectNew(): boolean {
    return this.addForm.get('projectChoice')!.value === '__new';
  }

  get isEmployeeNew(): boolean {
    return this.addForm.get('employeeChoice')!.value === '__new';
  }

  hasError(controlName: string): boolean {
    const ctrl = this.addForm.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  submitNewEntry() {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const raw = this.addForm.value;
    const projectName = this.resolveEntityName(raw.projectChoice, raw.projectName ?? '', this.projectIndex);
    const employeeName = this.resolveEntityName(raw.employeeChoice, raw.employeeName ?? '', this.employeeIndex);

    if (!projectName || !employeeName || !raw.date) {
      this.submitError = 'Compila tutti i campi obbligatori.';
      return;
    }

    const hours = Number(raw.hours);
    if (Number.isNaN(hours)) {
      this.submitError = 'Inserisci un numero valido di ore.';
      return;
    }

    const payload: CreateActivityRequest = {
      projectName,
      employeeName,
      date: raw.date,
      hours,
    };

    this.isSubmitting = true;
    this.submitError = null;

    this.timesheetService.createActivity(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = 'Non è stato possibile registrare l\'attività. Riprova.';
      },
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  trackById(_: number, item: NamedEntity) { return item.id; }

  private distinctNamedEntities(items: NamedEntity[]): NamedEntity[] {
    const seen = new Map<number, NamedEntity>();
    for (const item of items) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  private updateProjectNameValidators(choice: string | null) {
    const ctrl = this.addForm.get('projectName')!;
    if (choice === '__new') {
      ctrl.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue('', { emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private updateEmployeeNameValidators(choice: string | null) {
    const ctrl = this.addForm.get('employeeName')!;
    if (choice === '__new') {
      ctrl.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue('', { emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private resolveEntityName(choice: string | null | undefined, nameFromInput: string, index: Map<number, NamedEntity>): string | null {
    if (!choice) return null;
    if (choice === '__new') {
      const trimmed = nameFromInput.trim();
      return trimmed ? trimmed : null;
    }
    const entity = index.get(Number(choice));
    return entity ? entity.name : null;
  }
}
