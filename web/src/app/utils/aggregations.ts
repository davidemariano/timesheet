import { GroupKey, TimesheetEntry, Row, TableVM } from '../model/model';

// Formatta la data in modo DETERMINISTICO alla giornata locale (Europe/Rome)
function toRomeDay(iso: string): string {
  // "en-CA" => YYYY-MM-DD, timeZone garantisce la corretta giornata locale
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

const accessors: Record<GroupKey, (e: TimesheetEntry) => { key: string; label: string }> = {
  project: (e) => ({ key: `project:${e.project.id}`, label: e.project.name }),
  employee: (e) => ({ key: `employee:${e.employee.id}`, label: e.employee.name }),
  date: (e) => {
    const d = toRomeDay(e.date);
    return { key: `date:${d}`, label: d };
  },
};

export function buildViewModel(
  data: TimesheetEntry[],
  groupOrder: GroupKey[] // lunghezza 0, 1 o 2
): TableVM {
  const headers: Record<string, string> = {
    project: 'Project',
    employee: 'Employee',
    date: 'Date',
    hours: 'Hours',
  };

  // Nessun raggruppamento -> tabella "raw" a 4 colonne
  if (groupOrder.length === 0) {
    const rows: Row[] = data.map(e => ({
      project: e.project.name,
      employee: e.employee.name,
      date: toRomeDay(e.date),
      hours: e.hours,
    }));

    return { columns: ['project', 'employee', 'date', 'hours'], headers, rows };
  }

  // Raggruppamento 1 o 2 livelli
  type Agg = { labels: string[]; hours: number };
  const buckets = new Map<string, Agg>();

  for (const e of data) {
    const labels: string[] = [];
    const keys: string[] = [];

    for (const g of groupOrder) {
      const a = accessors[g](e);
      labels.push(a.label);
      keys.push(a.key);
    }

    const composite = keys.join('|');
    const curr = buckets.get(composite) ?? { labels, hours: 0 };
    curr.hours += e.hours;
    buckets.set(composite, curr);
  }

  // Flatten rows e ordina alfabeticamente per ogni livello
  const rows: Row[] = Array.from(buckets.values())
    .map(({ labels, hours }) => {
      const r: any = { hours };
      groupOrder.forEach((g, i) => { r[g] = labels[i]; });
      return r as Row;
    })
    .sort((a, b) => {
      for (const g of groupOrder) {
        const av = String(a[g] ?? '');
        const bv = String(b[g] ?? '');
        const cmp = av.localeCompare(bv, 'it');
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

  return { columns: [...groupOrder, 'hours'], headers, rows };
}