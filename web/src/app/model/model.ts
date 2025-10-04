export type GroupKey = 'project' | 'employee' | 'date';

export interface NamedEntity { id: number; name: string; }

export interface TimesheetEntry {
  project: NamedEntity;
  employee: NamedEntity;
  date: string; // ISO string
  hours: number;
}

export type Row = Record<string, string | number> & { hours: number };

export interface TableVM {
  columns: string[]; // es. ["project", "employee", "date", "hours"] o ["project", "hours"]
  headers: Record<string, string>; // etichette intestazioni
  rows: Row[];
}
