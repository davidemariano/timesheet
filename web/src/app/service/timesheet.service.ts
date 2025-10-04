import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { TimesheetEntry } from '../model/model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  constructor(private http: HttpClient) {}

  
  load(): Observable<TimesheetEntry[]> {
    return this.http.get<TimesheetEntry[]>(`${environment.apiBaseUrl}/api/activities`).pipe(shareReplay(1));
  }
}
