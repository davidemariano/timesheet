import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subscription, combineLatest, map, startWith, tap } from 'rxjs';
import { GroupKey, NamedEntity, TableVM, TimesheetEntry } from '../../model/model';
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
    }),
    tap(vm => this.latestVm = vm)
  );

  private latestVm: TableVM | null = null;

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

    this.subscriptions.add(this.timesheetService.createActivity(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = 'Non è stato possibile registrare l\'attività. Riprova.';
      },
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  trackById(_: number, item: NamedEntity) { return item.id; }

  onExportCsv() {
    if (!this.latestVm) return;
    const csv = this.buildCsv(this.latestVm);
    this.downloadFile(csv, this.buildFilename('timesheet', 'csv'), 'text/csv;charset=utf-8;');
  }

  onExportPdf() {
    if (!this.latestVm) return;
    const pdf = this.buildPdf(this.latestVm);
    this.downloadFile(pdf, this.buildFilename('timesheet', 'pdf'), 'application/pdf');
  }

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

  private formatValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object') {
      const maybeName = (value as { name?: unknown }).name;
      if (typeof maybeName === 'string') return maybeName;
      return JSON.stringify(value);
    }
    return String(value);
  }

  private escapeCsv(value: string): string {
    if (/[";\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private buildCsv(vm: TableVM): string {
    const headers = vm.columns.map(col => vm.headers[col] ?? col);
    const rows = vm.rows.map(row => vm.columns.map(col => this.formatValue(row[col])));
    const lines = [headers, ...rows].map(line => line.map(cell => this.escapeCsv(cell)).join(';'));
    return lines.join('\n');
  }

  private escapePdf(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private buildPdf(vm: TableVM): string {
    const headers = vm.columns.map(col => vm.headers[col] ?? col).join(' | ');
    const rows = vm.rows.map(row => vm.columns.map(col => this.formatValue(row[col])).join(' | '));
    const lines = [headers, ...rows];
    if (lines.length === 1) {
      lines.push('Nessun dato disponibile');
    }

    const escapedLines = lines.map(line => this.escapePdf(line));
    let textStream = 'BT\n/F1 12 Tf\n14 TL\n1 0 0 1 40 800 Tm\n';
    escapedLines.forEach((line, index) => {
      if (index === 0) {
        textStream += `(${line}) Tj\n`;
      } else {
        textStream += `T* (${line}) Tj\n`;
      }
    });
    textStream += 'ET';

    const encoder = new TextEncoder();
    const streamBytes = encoder.encode(textStream);
    const streamLength = streamBytes.length;

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${textStream}\nendstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    ];

    let pdf = '%PDF-1.3\n';
    const offsets: number[] = [0];
    objects.forEach(obj => {
      offsets.push(pdf.length);
      pdf += obj;
    });

    const xrefPosition = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += 'trailer\n';
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefPosition}\n`;
    pdf += '%%EOF';

    return pdf;
  }

  private buildFilename(base: string, ext: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${base}-${stamp}.${ext}`;
  }

  private downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
