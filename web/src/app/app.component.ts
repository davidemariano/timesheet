// app.component.ts
import { Component } from '@angular/core';
import { TimesheetPageComponent } from '../app/pages/timesheet/timesheet.component';
import { PageHeaderComponent } from './components/core/page-header/page-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PageHeaderComponent, TimesheetPageComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}
