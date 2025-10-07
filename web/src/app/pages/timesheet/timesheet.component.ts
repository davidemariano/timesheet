import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subscription, combineLatest, map, tap } from 'rxjs';
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
  // Servizi principali per accedere ai dati e costruire reactive form.
  private timesheetService = inject(TimesheetService);
  private fb = inject(FormBuilder);

  // Raccolta centralizzata delle subscription da chiudere in ngOnDestroy.
  private subscriptions = new Subscription();
  // Indici locali per mappare velocemente id → NamedEntity.
  private projectIndex = new Map<number, NamedEntity>();
  private employeeIndex = new Map<number, NamedEntity>();

  // Signalizza i filtri di raggruppamento scelti dal componente figlio.
  private group1Subject = new BehaviorSubject<GroupKey | null>(null);
  private group2Subject = new BehaviorSubject<GroupKey | null>(null);

  group1$ = this.group1Subject.asObservable();
  group2$ = this.group2Subject.asObservable();

  // Stream principale delle attività provenienti dal servizio.
  readonly activities$ = this.timesheetService.getActivities();

  // Liste di progetti/dipendenti uniche, pronte per popolare le select del modale.
  readonly projects$: Observable<NamedEntity[]> = this.activities$.pipe(
    map(entries => this.distinctNamedEntities(entries.map(e => e.project))),
    tap(list => this.projectIndex = new Map(list.map(item => [item.id, item])))
  );

  readonly employees$: Observable<NamedEntity[]> = this.activities$.pipe(
    map(entries => this.distinctNamedEntities(entries.map(e => e.employee))),
    tap(list => this.employeeIndex = new Map(list.map(item => [item.id, item])))
  );

  readonly vm$ = combineLatest([
    this.activities$,
    this.group1$, this.group2$,
  ]).pipe(
    map(([data, g1, g2]) => {
      const groups = [g1, g2].filter((x): x is GroupKey => !!x);
      return buildViewModel(data, groups);
    }),
    tap(vm => this.latestVm = vm)
  );

  // Ultimo view model emesso, usato da CSV/PDF.
  private latestVm: TableVM | null = null;

  // Form reattivo del modale di inserimento attività.
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
    // Ricostruisce i validator del campo progetto quando cambia la select.
    this.subscriptions.add(
      this.addForm.get('projectChoice')!.valueChanges.subscribe(choice => {
        this.updateProjectNameValidators(choice);
      })
    );
    // Idem per il campo dipendente.
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

    // Normalizza la coppia progetto/dipendente recuperando il nome definitivo.
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

  // Triggera il download del CSV relativo allo stato attuale della tabella.
  onExportCsv() {
    if (!this.latestVm) return;
    const csv = this.buildCsv(this.latestVm);
    this.downloadFile(csv, this.buildFilename('timesheet', 'csv'), 'text/csv;charset=utf-8;');
  }

  // Genera un PDF testuale minimale dell'attuale view model.
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

  // Aggiunge/rimuove i vincoli quando si sceglie di creare un nuovo progetto.
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

  // Replica la stessa logica per i dipendenti.
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

  // Converte qualsiasi valore di cella in stringa pronta per export/render.
  private formatValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object') {
      const maybeName = (value as { name?: unknown }).name;
      if (typeof maybeName === 'string') return maybeName;
      return JSON.stringify(value);
    }
    return String(value);
  }

  // Escaping semplice per valori CSV con punti e virgola, virgolette o newline.
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

  // Escaping minimo richiesto dal formato PDF per i text stream.
  private escapePdf(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  // Costruisce un PDF tabellare multi-pagina ispirato allo stile Bootstrap della tabella.
  private buildPdf(vm: TableVM): string {
    const pageWidth = 595; // A4 portrait
    const pageHeight = 842;
    const margin = 40;
    const headerHeight = 28;
    const rowHeight = 22;
    const paddingX = 10;
    const fontSize = 12;
    const tableWidth = pageWidth - margin * 2;

    const headers = vm.columns.map(col => vm.headers[col] ?? col);
    const rows = vm.rows.map(row => vm.columns.map(col => this.formatValue(row[col])));

    const columnWidths = this.computeColumnWidths(headers, rows, tableWidth, fontSize);
    const tableLeft = margin;

    const pageContents: string[] = [];
    const encoder = new TextEncoder();

    let content = '';
    let currentY = pageHeight - margin;

    const drawRow = (cells: string[], options: { header?: boolean; zebra?: boolean }) => {
      const isHeader = !!options.header;
      const height = isHeader ? headerHeight : rowHeight;
      currentY -= height;
      const y = currentY;

      if (isHeader) {
        content += `q 0.92 g ${tableLeft.toFixed(2)} ${y.toFixed(2)} ${tableWidth.toFixed(2)} ${height.toFixed(2)} re f Q\n`;
      } else if (options.zebra) {
        content += `q 0.97 g ${tableLeft.toFixed(2)} ${y.toFixed(2)} ${tableWidth.toFixed(2)} ${height.toFixed(2)} re f Q\n`;
      }

      content += `q 0.65 G 0.5 w ${tableLeft.toFixed(2)} ${y.toFixed(2)} ${tableWidth.toFixed(2)} ${height.toFixed(2)} re S Q\n`;

      let verticalCursor = tableLeft;
      for (let i = 0; i < columnWidths.length - 1; i++) {
        verticalCursor += columnWidths[i];
        content += `q 0.85 G 0.5 w ${verticalCursor.toFixed(2)} ${y.toFixed(2)} m ${verticalCursor.toFixed(2)} ${(y + height).toFixed(2)} l S Q\n`;
      }

      // Posiziona il testo leggermente sotto il centro verticale della cella.
      const textBaseline = y + height / 5 + fontSize * 0.35;
      let columnStart = tableLeft;
      for (let i = 0; i < cells.length; i++) {
        const colWidth = columnWidths[i];
        const textX = columnStart + paddingX;
        const truncated = this.truncateForWidth(cells[i], colWidth - paddingX * 2, fontSize);
        const escaped = this.escapePdf(truncated);
        content += `BT /F1 ${fontSize} Tf 1 0 0 1 ${textX.toFixed(2)} ${textBaseline.toFixed(2)} Tm (${escaped}) Tj ET\n`;
        columnStart += colWidth;
      }
    };

    const startPage = () => {
      content = '';
      currentY = pageHeight - margin;
    };

    const finishPage = () => {
      if (content.trim().length > 0) {
        pageContents.push(content);
      }
    };

    const ensureSpace = (height: number) => {
      if (currentY - height < margin) {
        finishPage();
        startPage();
        drawRow(headers, { header: true });
      }
    };

    startPage();
    drawRow(headers, { header: true });

    rows.forEach((cells, index) => {
      ensureSpace(rowHeight);
      drawRow(cells, { zebra: index % 2 === 1 });
    });

    finishPage();

    if (pageContents.length === 0) {
      pageContents.push('BT /F1 12 Tf 1 0 0 1 50 800 Tm (Nessun dato disponibile) Tj ET\n');
    }

    const objects: string[] = [];
    const pageCount = pageContents.length;
    const pageObjNumbers: number[] = [];
    const contentObjNumbers: number[] = [];

    let nextObj = 3;
    for (let i = 0; i < pageCount; i++) {
      pageObjNumbers.push(nextObj++);
    }
    for (let i = 0; i < pageCount; i++) {
      contentObjNumbers.push(nextObj++);
    }
    const fontObjNumber = nextObj++;

    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    const kids = pageObjNumbers.map(n => `${n} 0 R`).join(' ');
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`);

    for (let i = 0; i < pageCount; i++) {
      const pageObj = pageObjNumbers[i];
      const contentObj = contentObjNumbers[i];
      objects.push(
`${pageObj} 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjNumber} 0 R >> >> /Contents ${contentObj} 0 R >>
endobj
`);
    }

    for (let i = 0; i < pageCount; i++) {
      const contentObj = contentObjNumbers[i];
      const body = pageContents[i];
      const contentBytes = encoder.encode(body);
      objects.push(
`${contentObj} 0 obj
<< /Length ${contentBytes.length} >>
stream
${body}
endstream
endobj
`);
    }

    objects.push(
`${fontObjNumber} 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`);

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }

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

  // Stima approssimativa della larghezza di un testo in funzione del font.
  private estimateTextWidth(text: string, fontSize = 12): number {
    return text.length * (fontSize * 0.5);
  }

  // Tronca il testo aggiungendo "..." quando eccede lo spazio disponibile della colonna.
  private truncateForWidth(text: string, maxWidth: number, fontSize = 12): string {
    if (maxWidth <= 0) return '';
    if (this.estimateTextWidth(text, fontSize) <= maxWidth) return text;
    const ellipsis = '...';
    const ellipsisWidth = this.estimateTextWidth(ellipsis, fontSize);
    if (ellipsisWidth >= maxWidth) {
      return ellipsis;
    }
    let result = '';
    for (const char of text) {
      if (this.estimateTextWidth(result + char, fontSize) > maxWidth - ellipsisWidth) break;
      result += char;
    }
    return result ? result + ellipsis : ellipsis;
  }

  // Calcola le larghezze delle colonne in modo proporzionale alla lunghezza dei contenuti.
  private computeColumnWidths(headers: string[], rows: string[][], availableWidth: number, fontSize = 12): number[] {
    const columnCount = Math.max(headers.length, 1);
    const minWidth = Math.min(120, availableWidth / columnCount);
    const weights: number[] = headers.map((header, idx) => {
      const texts = [header, ...rows.map(row => row[idx] ?? '')];
      const widths = texts.map(text => this.estimateTextWidth(text, fontSize));
      return Math.max(...widths, fontSize * 4);
    });
    const weightSum = weights.reduce((acc, w) => acc + w, 0) || 1;
    let widths = weights.map(w => (availableWidth * w) / weightSum);
    widths = widths.map(w => Math.max(w, minWidth));
    let total = widths.reduce((acc, w) => acc + w, 0);
    if (total > availableWidth) {
      const scale = availableWidth / total;
      widths = widths.map(w => w * scale);
      total = widths.reduce((acc, w) => acc + w, 0);
    }
    const diff = availableWidth - total;
    widths[widths.length - 1] += diff;
    return widths;
  }

  // Restituisce un nome file con timestamp ISO safe per i filesystem.
  private buildFilename(base: string, ext: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${base}-${stamp}.${ext}`;
  }

  // Utilizza un blob temporaneo per avviare il download e poi libera l'URL.
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
