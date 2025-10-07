import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GroupKey } from '../../model/model';

@Component({
  selector: 'group-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-filters.component.html',
  styleUrls: ['./group-filters.component.scss'],
})
export class GroupFiltersComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  private _group1: GroupKey | null = null;
  @Input() set group1(value: GroupKey | null) {
    this._group1 = value;
    this.currentGroup1 = value;
  }
  get group1(): GroupKey | null { return this._group1; }

  private _group2: GroupKey | null = null;
  @Input() set group2(value: GroupKey | null) {
    this._group2 = value;
    this.currentGroup2 = value;
  }
  get group2(): GroupKey | null { return this._group2; }

  @Output() group1Change = new EventEmitter<GroupKey | null>();
  @Output() group2Change = new EventEmitter<GroupKey | null>();
  @Output() exportCsv = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();

  // Opzioni disponibili per i menu a tendina e relative etichette.
  keys: GroupKey[] = ['project', 'employee', 'date'];
  labels: Record<GroupKey, string> = { project: 'Project', employee: 'Employee', date: 'Date' };

  private currentGroup1: GroupKey | null = null;
  private currentGroup2: GroupKey | null = null;

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const rawGroup1 = params.get('group1');
        const rawGroup2 = params.get('group2');
        const group1Param = this.parseGroupKey(rawGroup1);
        const group2Param = this.parseGroupKey(rawGroup2);

        const normalizedGroup1 = group1Param ?? null;
        const normalizedGroup2 = normalizedGroup1 && group2Param && group2Param !== normalizedGroup1 ? group2Param : null;

        if (normalizedGroup1 !== this.currentGroup1) {
          this.currentGroup1 = normalizedGroup1;
          this._group1 = normalizedGroup1;
          this.group1Change.emit(normalizedGroup1);
        }
        if (normalizedGroup2 !== this.currentGroup2) {
          this.currentGroup2 = normalizedGroup2;
          this._group2 = normalizedGroup2;
          this.group2Change.emit(normalizedGroup2);
        }

        const desiredGroup1 = normalizedGroup1 ?? null;
        const desiredGroup2 = normalizedGroup1 && normalizedGroup2 ? normalizedGroup2 : null;

        if ((rawGroup1 ?? null) !== desiredGroup1 || (rawGroup2 ?? null) !== desiredGroup2) {
          this.updateQueryParams(normalizedGroup1, normalizedGroup2);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Gestisce la selezione del primo raggruppamento, garantendo coerenza con il secondo.
  onChangeGroup1(v: GroupKey | null) {
    this.currentGroup1 = v ?? null;
    this._group1 = v ?? null;

    if (v == null) {
      if (this.currentGroup2 !== null) {
        this.currentGroup2 = null;
        this._group2 = null;
        this.group2Change.emit(null);
      }
      this.group1Change.emit(null);
      this.updateQueryParams(null, null);
      return;
    }

    this.group1Change.emit(v);

    if (this.currentGroup2 === v) {
      this.currentGroup2 = null;
      this._group2 = null;
      this.group2Change.emit(null);
    }

    this.updateQueryParams(this.currentGroup1, this.currentGroup2);
  }

  // Propaga la modifica del secondo livello di raggruppamento.
  onChangeGroup2(v: GroupKey | null) {
    if (!this.currentGroup1) {
      this.currentGroup2 = null;
      this._group2 = null;
      this.group2Change.emit(null);
      this.updateQueryParams(this.currentGroup1, this.currentGroup2);
      return;
    }

    if (v && v === this.currentGroup1) {
      this.currentGroup2 = null;
    } else {
      this.currentGroup2 = v ?? null;
    }
    this._group2 = this.currentGroup2;

    this.group2Change.emit(this.currentGroup2);
    this.updateQueryParams(this.currentGroup1, this.currentGroup2);
  }

  // Reset simultaneo di entrambi i campi.
  clear() {
    this.currentGroup1 = null;
    this.currentGroup2 = null;
    this._group1 = null;
    this._group2 = null;
    this.group1Change.emit(null);
    this.group2Change.emit(null);
    this.updateQueryParams(null, null);
  }

  triggerCsv() { this.exportCsv.emit(); }
  triggerPdf() { this.exportPdf.emit(); }

  private parseGroupKey(value: string | null): GroupKey | null {
    if (!value) return null;
    return this.keys.includes(value as GroupKey) ? (value as GroupKey) : null;
  }

  private updateQueryParams(group1: GroupKey | null, group2: GroupKey | null) {
    const params = { ...this.route.snapshot.queryParams } as Record<string, any>;

    if (group1) params['group1'] = group1;
    else delete params['group1'];

    if (group1 && group2) params['group2'] = group2;
    else delete params['group2'];

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true,
    });
  }
}
