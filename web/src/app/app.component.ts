// app.component.ts
import { Component } from '@angular/core';
import { TimesheetPageComponent } from '../app/pages/timesheet/timesheet.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TimesheetPageComponent],
  template: `<app-timesheet-page />`
})
export class AppComponent {}