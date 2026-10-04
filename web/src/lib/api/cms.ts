import { supabase } from '@/lib/supabase';

// Generic CMS data layer — all calls go through the normal client, so RLS
// decides what each role can read/write. Denied writes surface as errors.
// Dynamic table names can't be statically typed — the registry controls inputs.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Row = Record<string, unknown>;

export async function listRows(table: string, select: string, order = 'created_at'): Promise<Row[]> {
  const { data, error } = await db
    .from(table)
    .select(select)
    .order(order, { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []) as Row[];
}

export async function getRow(table: string, id: string, select: string): Promise<Row> {
  const { data, error } = await db.from(table).select(select).eq('id', id).single();
  if (error) throw error;
  return data as Row;
}

export async function insertRow(table: string, payload: Row): Promise<Row> {
  const { data, error } = await db.from(table).insert(payload).select().single();
  if (error) throw error;
  return data as Row;
}

export async function updateRow(table: string, id: string, payload: Row): Promise<Row> {
  const { data, error } = await db.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Row;
}

/** Soft-delete: content tables use status archiving, not row deletion. */
export async function archiveRow(table: string, id: string): Promise<void> {
  const { error } = await db.from(table).update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'item';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Upload to the public-media bucket; returns the public URL for cover fields. */
export async function uploadCmsImage(file: File, entity: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `cms/${entity}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('public-media').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('public-media').getPublicUrl(path).data.publicUrl;
}

/** Options for relation pickers — RLS-scoped so scoped admins only see theirs. */
export async function getOptions(table: string, labelCol = 'name'): Promise<{ id: string; label: string }[]> {
  const { data, error } = await db.from(table).select(`id,${labelCol}`).order(labelCol).limit(300);
  if (error) return [];
  return (data || []).map((r: { id: string } & Record<string, string>) => ({ id: r.id, label: r[labelCol] || r.id }));
}
