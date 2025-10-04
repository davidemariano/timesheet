import { z } from 'zod';

export const groupKeySchema = z.enum(['project','employee','date']);
export type GroupKey = z.infer<typeof groupKeySchema>;

export const groupSpecSchema = z.object({
  keys: z.array(groupKeySchema),
  dateBucket: z.enum(['day','week','month','quarter']).optional()
});
export type GroupSpec = z.infer<typeof groupSpecSchema>;

export type RowKind = 'group' | 'leaf' | 'subtotal' | 'grandTotal';

export interface Activity {
  project: string; employee: string; date: string; hours: number;
}

interface TreeNode {
  level: number;
  key: GroupKey | null;
  value: string | null;
  label: string;
  total: number;
  children: Map<string, TreeNode>;
  leaves: Activity[];
}

export interface FlatRow {
  kind: RowKind;
  level: number;
  path: string[];
  label: string;
  hours: number;
}

function bucketDate(iso: string, mode?: GroupSpec['dateBucket']): string {
  if (!mode || mode === 'day') return iso;
  const [y, m, d] = iso.split('-').map(Number);
  if (mode === 'month') return `${y}-${String(m).padStart(2,'0')}`;
  if (mode === 'quarter') { const q = Math.floor((m-1)/3)+1; return `${y}-Q${q}`; }
  if (mode === 'week') {
    const dt = new Date(Date.UTC(y, m-1, d));
    const start = new Date(Date.UTC(y,0,1));
    const dayOfYear = Math.floor((+dt - +start)/86400000)+1;
    const wk = Math.floor((dayOfYear-1)/7)+1;
    return `${y}-W${wk}`;
  }
  return iso;
}

export function aggregate(data: Activity[], spec: GroupSpec): FlatRow[] {
  const root: TreeNode = {
    level: -1, key: null, value: null, label: 'root', total: 0,
    children: new Map(), leaves: []
  };

  const keys = spec.keys;

  for (const it of data) {
    const enriched = { ...it, date: bucketDate(it.date, spec.dateBucket) };
    let node = root;
    if (keys.length === 0) {
      root.leaves.push(enriched);
      root.total += enriched.hours;
      continue;
    }
    for (let lvl=0; lvl<keys.length; lvl++) {
      const k = keys[lvl];
      const val = (enriched as any)[k] as string;
      if (!node.children.has(val)) {
        node.children.set(val, {
          level: lvl, key: k, value: val, label: `${k}: ${val}`,
          total: 0, children: new Map(), leaves: []
        });
      }
      node = node.children.get(val)!;
      node.total += enriched.hours;
    }
    node.leaves.push(enriched);
    root.total += enriched.hours;
  }

  // flatten con righe group/leaf/subtotal e grand total
  const rows: FlatRow[] = [];
  function dfs(n: TreeNode, path: string[]) {
    if (n.level >= 0) {
      rows.push({ kind:'group', level:n.level, path, label:n.label, hours:n.total });
    }
    if (n.children.size === 0) {
      for (const leaf of n.leaves) {
        rows.push({
          kind: 'leaf', level: n.level+1, path,
          label: `${leaf.project} | ${leaf.employee} | ${leaf.date}`,
          hours: leaf.hours
        });
      }
    } else {
      for (const child of Array.from(n.children.values()).sort((a,b)=>a.value!.localeCompare(b.value!,'it',{numeric:true}))) {
        dfs(child, [...path, child.value!]);
      }
    }
    if (n.level >= 0) rows.push({ kind: 'subtotal', level:n.level, path, label:`Subtotal — ${n.label}`, hours:n.total });
  }

  for (const child of root.children.values()) dfs(child, [child.value!]);
  rows.push({ kind:'grandTotal', level:0, path:[], label:'Grand Total', hours: root.total });
  return rows;
}