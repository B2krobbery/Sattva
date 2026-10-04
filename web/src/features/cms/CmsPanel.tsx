import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, Loader2, X, SendHorizonal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listRows, getRow, insertRow, updateRow, archiveRow, slugify, type Row } from '@/lib/api/cms';
import { ENTITIES, type EntityConfig } from './entities';
import { CmsField, fieldLabel, type FormState } from './fields';
import { cn } from '@/lib/utils';

const SLUG_TABLES = new Set(['temples', 'puja_offerings', 'events', 'festivals', 'live_streams', 'seva_campaigns']);
const STATUS_CHIP: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-600',
  published: 'bg-tulsi/15 text-tulsi',
  archived: 'bg-surface-subtle text-text-muted',
  active: 'bg-tulsi/15 text-tulsi',
};

function rowTitle(row: Row, e: EntityConfig): string {
  return (row[e.titleKey] as string) || '—';
}

function buildPayload(entity: EntityConfig, form: FormState, existing: Row | null, isNew: boolean): Row {
  const payload: Row = isNew ? { ...(entity.defaults || {}) } : {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === '__now__') payload[k] = new Date().toISOString();
  }
  for (const f of entity.fields) {
    let v = form[f.key];
    if (v === '') v = null;
    if (f.type === 'bool' && v == null) v = false;
    if (f.type === 'uuid' && v == null && isNew) v = crypto.randomUUID();
    if (f.key === 'suggested_amounts') {
      if (v == null) continue; // keep the [] default
      v = String(v).split(',').map((s) => Math.round(Number(s.trim()) * 100)).filter((n) => n > 0);
    }
    if (f.i18n) {
      // name/title columns are GENERATED from *_i18n — write only the jsonb.
      const prior = (existing?.[f.i18n] as Record<string, string>) || {};
      payload[f.i18n] = v ? { ...prior, en: v } : prior;
      continue;
    }
    payload[f.key] = v;
  }
  return payload;
}

export function CmsPanel() {
  const queryClient = useQueryClient();
  const [entityId, setEntityId] = useState('offerings');
  const [editing, setEditing] = useState<Row | null | 'new'>(null);
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const entity = ENTITIES.find((e) => e.id === entityId)!;

  const { data: rows, isLoading, error: listError } = useQuery({
    queryKey: ['cms', entity.table],
    queryFn: () => listRows(entity.table, 'id,' + (SLUG_TABLES.has(entity.table) ? 'slug,' : '') + entity.titleKey + ',status,updated_at,created_at' + (entity.table === 'animals' ? ',is_public' : '')),
  });

  const filtered = (rows || []).filter((r) =>
    !search || rowTitle(r, entity).toLowerCase().includes(search.toLowerCase())
  );

  const openEditor = async (row: Row | null) => {
    setError(null);
    if (!row) {
      const defaults: FormState = {};
      entity.fields.forEach((f) => { defaults[f.key] = f.default ?? null; });
      setForm(defaults);
      setEditing('new');
    } else {
      // The list only selects a few columns — fetch the full row or edits
      // would blank fields the list never fetched (and overwrite i18n).
      // i18n fields live ONLY in *_i18n (except generated name/title) — select
      // the jsonb column, not the virtual key.
      const cols = [...new Set(entity.fields.flatMap((f) =>
        f.i18n ? [f.i18n] : [f.key]
      ))];
      let full: Row;
      try {
        full = await getRow(entity.table, row.id as string, 'id,' + [entity.titleKey, ...cols].join(','));
      } catch (e) {
        setError((e as { message?: string })?.message || 'Could not load the record');
        return;
      }
      const state: FormState = {};
      entity.fields.forEach((f) => {
        let v = f.i18n ? (full[f.i18n] as Record<string, string>)?.en ?? null : full[f.key];
        if (f.key === 'suggested_amounts' && Array.isArray(v)) v = (v as number[]).map((n) => n / 100).join(', ');
        if (f.type === 'datetime' && v) v = String(v).slice(0, 16);
        if (f.type === 'date' && v) v = String(v).slice(0, 10);
        state[f.key] = v ?? f.default ?? null;
      });
      setForm(state);
      setEditing(full);
    }
  };

  const save = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(entity, form, editing === 'new' ? null : editing, editing === 'new');
      if (entity.hasStatus && entity.fields.some((f) => f.options?.some((o) => o.value === 'draft'))) {
        payload.status = publish ? 'published' : (form.status || 'draft');
      }
      if (editing === 'new') {
        if (SLUG_TABLES.has(entity.table)) payload.slug = slugify(String(form[entity.titleKey] || entity.singular));
        await insertRow(entity.table, payload);
      } else {
        await updateRow(entity.table, (editing as Row).id as string, payload);
      }
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['cms', entity.table] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(msg || 'Save failed — RLS may deny this write for your role');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (row: Row) => {
    try { await archiveRow(entity.table, row.id as string); queryClient.invalidateQueries({ queryKey: ['cms', entity.table] }); } catch { /* noop */ }
  };

  const groups = [...new Set(entity.fields.map((f) => f.group || 'Fields'))];
  const usesDraftStatus = entity.fields.some((f) => f.options?.some((o) => o.value === 'draft'));

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      {/* Section rail */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {ENTITIES.map((e) => (
          <button key={e.id} onClick={() => { setEntityId(e.id); setEditing(null); setSearch(''); }}
            className={cn('inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-all',
              entityId === e.id ? 'bg-terracotta text-white border-terracotta' : 'bg-surface text-text-secondary border-border hover:border-terracotta/50')}>
            <e.icon size={14} /> {e.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="form-input text-sm bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 w-full max-w-xs"
          placeholder={`Search ${entity.label.toLowerCase()}…`}
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => openEditor(null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-terracotta text-white text-sm font-semibold hover:bg-terracotta-hover shrink-0">
          <Plus size={14} /> New {entity.singular}
        </button>
      </div>

      {/* List */}
      {isLoading && <div className="flex justify-center py-10 text-text-muted"><Loader2 className="animate-spin" /></div>}
      {listError && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{(listError as Error).message}</div>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-text-muted py-8 text-center">No {entity.label.toLowerCase()} yet — create the first one.</p>
      )}
      <div className="flex flex-col gap-2.5">
        {filtered.map((row) => (
          <div key={row.id as string} className="glass-card flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border-subtle bg-surface">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary truncate">{rowTitle(row, entity)}</div>
              <div className="text-[11px] text-text-muted font-mono truncate">{row.slug as string || (row.id as string).slice(0, 8)}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_CHIP[String(row.status)] || 'bg-surface-subtle text-text-secondary')}>
                {String(row.status)}
              </span>
              <button onClick={() => openEditor(row)} className="p-2 rounded-lg hover:bg-surface-subtle text-text-secondary" aria-label={`Edit ${rowTitle(row, entity)}`}>
                <Pencil size={14} />
              </button>
              {usesDraftStatus && row.status !== 'archived' && (
                <button onClick={() => archive(row)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400" aria-label="Archive">
                  <Archive size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Editor drawer */}
      <AnimatePresence>
        {editing && (
          <>
            <button className="fixed inset-0 z-40 bg-black/30 cursor-default" onClick={() => setEditing(null)} aria-label="Close editor" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-surface border-l border-border-subtle shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                <div>
                  <div className="text-base font-bold text-text-primary">
                    {editing === 'new' ? `New ${entity.singular}` : `Edit — ${rowTitle(editing, entity)}`}
                  </div>
                  <div className="text-[11px] text-text-muted">{entity.label}</div>
                </div>
                <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-surface-subtle"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
                {groups.map((g) => (
                  <div key={g}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gold mb-2.5">{g}</div>
                    <div className="flex flex-col gap-3.5">
                      {entity.fields.filter((f) => (f.group || 'Fields') === g).map((f) => (
                        <div key={f.key}>
                          {fieldLabel(f)}
                          <CmsField field={f} value={form[f.key]} onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {error && <div className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}
              </div>

              <div className="px-5 py-4 border-t border-border-subtle flex gap-2">
                {usesDraftStatus ? (
                  <>
                    <button onClick={() => save(false)} disabled={saving}
                      className="flex-1 px-4 py-2.5 rounded-full bg-surface-subtle border border-border text-sm font-semibold text-text-primary disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button onClick={() => save(true)} disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-terracotta text-white text-sm font-semibold hover:bg-terracotta-hover disabled:opacity-50">
                      <SendHorizonal size={14} /> {saving ? '…' : 'Publish'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => save(false)} disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-full bg-terracotta text-white text-sm font-semibold hover:bg-terracotta-hover disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
