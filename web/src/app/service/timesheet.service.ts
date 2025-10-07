import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, shareReplay, switchMap, tap } from 'rxjs';
import { NamedEntity, TimesheetEntry } from '../model/model';
import { environment } from '../../environments/environment';

interface ApiNamedEntity {
  id?: number;
  name: string;
}

type ApiEntity = string | ApiNamedEntity;

interface ApiActivity {
  project: ApiEntity;
  employee: ApiEntity;
  date: string;
  hours: number;
}

export interface CreateActivityRequest {
  projectName: string;
  employeeName: string;
  date: string;
  hours: number;
}

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  constructor(private http: HttpClient) {}

  private readonly refreshTrigger$ = new BehaviorSubject<void>(void 0);
  private readonly projectIdMap = new Map<string, number>();
  private readonly employeeIdMap = new Map<string, number>();
  private nextProjectId = 1;
  private nextEmployeeId = 1;

  private readonly activities$ = this.refreshTrigger$.pipe(
    switchMap(() => this.http.get<ApiActivity[]>(`${environment.apiBaseUrl}/api/activities`)),
    map(list => list.map(item => this.mapToTimesheetEntry(item))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getActivities(): Observable<TimesheetEntry[]> {
    return this.activities$;
  }

  createActivity(request: CreateActivityRequest): Observable<TimesheetEntry> {
    const body = {
      project: request.projectName,
      employee: request.employeeName,
      date: request.date,
      hours: request.hours,
    };

    return this.http.post<ApiActivity>(`${environment.apiBaseUrl}/api/activities`, body).pipe(
      map(item => this.mapToTimesheetEntry(item)),
      tap(() => this.refreshTrigger$.next())
    );
  }

  private mapToTimesheetEntry(item: ApiActivity): TimesheetEntry {
    return {
      project: this.toNamedEntity(item.project, this.projectIdMap, () => this.nextProjectId++),
      employee: this.toNamedEntity(item.employee, this.employeeIdMap, () => this.nextEmployeeId++),
      date: item.date,
      hours: item.hours,
    };
  }

  private toNamedEntity(
    source: ApiEntity,
    cache: Map<string, number>,
    nextId: () => number,
  ): NamedEntity {
    if (typeof source === 'object') {
      const resolvedId = source.id ?? this.ensureId(source.name, cache, nextId);
      cache.set(source.name, resolvedId);
      if (resolvedId >= this.peekNextId(cache === this.projectIdMap ? 'project' : 'employee')) {
        this.bumpNextId(cache === this.projectIdMap ? 'project' : 'employee', resolvedId + 1);
      }
      return { id: resolvedId, name: source.name };
    }

    const name = source;
    const resolvedId = this.ensureId(name, cache, nextId);
    return { id: resolvedId, name };
  }

  private ensureId(name: string, cache: Map<string, number>, nextId: () => number): number {
    if (!cache.has(name)) {
      cache.set(name, nextId());
    }
    return cache.get(name)!;
  }

  private peekNextId(kind: 'project' | 'employee'): number {
    return kind === 'project' ? this.nextProjectId : this.nextEmployeeId;
  }

  private bumpNextId(kind: 'project' | 'employee', value: number): void {
    if (kind === 'project') {
      this.nextProjectId = Math.max(this.nextProjectId, value);
    } else {
      this.nextEmployeeId = Math.max(this.nextEmployeeId, value);
    }
  }
}
