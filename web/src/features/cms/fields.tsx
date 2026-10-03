import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, Loader2 } from 'lucide-react';
import { getOptions, uploadCmsImage } from '@/lib/api/cms';
import type { FieldConfig } from './entities';
import { cn } from '@/lib/utils';

export type FieldValue = unknown;
export type FormState = Record<string, FieldValue>;

interface FieldProps {
  field: FieldConfig;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}

const INPUT = 'form-input w-full text-sm bg-surface-subtle border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:border-terracotta/60';
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CmsField({ field, value, onChange }: FieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const entityForUpload = 'cms';

  const { data: options } = useQuery({
    queryKey: ['cms-options', field.relation?.table],
    queryFn: () => getOptions(field.relation!.table, field.relation!.labelCol),
    enabled: field.type === 'relation',
  });

  const str = value == null ? '' : String(value);

  switch (field.type) {
    case 'textarea':
      return <textarea className={cn(INPUT, 'min-h-[90px] resize-y')} value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.help} />;
    case 'json':
      return <textarea className={cn(INPUT, 'min-h-[80px] font-mono text-xs resize-y')} value={str || JSON.stringify(value ?? {}, null, 1)} onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { onChange(e.target.value); } }} placeholder={field.help} />;
    case 'number':
      return <input type="number" className={INPUT} value={str} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'money':
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">₹</span>
          <input type="number" className={cn(INPUT, 'pl-7')} value={value == null ? '' : Number(value) / 100 || ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Math.round(Number(e.target.value) * 100))} />
        </div>
      );
    case 'bool':
      return (
        <button type="button" onClick={() => onChange(!value)}
          className={cn('relative w-11 h-6 rounded-full transition-colors', value ? 'bg-tulsi' : 'bg-surface-subtle border border-border')}
          role="switch" aria-checked={!!value} aria-label={field.label}>
          <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', value ? 'left-[22px]' : 'left-0.5')} />
        </button>
      );
    case 'enum':
      return (
        <select className={INPUT} value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'date':
      return <input type="date" className={INPUT} value={str.slice(0, 10)} onChange={(e) => onChange(e.target.value || null)} />;
    case 'datetime':
      return <input type="datetime-local" className={INPUT} value={str.slice(0, 16)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case 'uuid':
      return (
        <div className="flex gap-2">
          <input className={INPUT} value={str} onChange={(e) => onChange(e.target.value)} />
          <button type="button" className="px-3 text-xs font-semibold bg-surface-subtle rounded-lg border border-border-subtle" onClick={() => onChange(crypto.randomUUID())}>New</button>
        </div>
      );
    case 'relation':
      return (
        <select className={INPUT} value={str} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">— pick —</option>
          {(options || []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      );
    case 'days': {
      const days = Array.isArray(value) ? (value as number[]) : [];
      return (
        <div className="flex gap-1.5 flex-wrap">
          {DAY_LABELS.map((d, i) => (
            <button key={i} type="button"
              onClick={() => onChange(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
              className={cn('w-9 h-9 rounded-lg text-xs font-bold transition-all',
                days.includes(i) ? 'bg-terracotta text-white' : 'bg-surface-subtle text-text-muted border border-border-subtle')}>
              {d}
            </button>
          ))}
        </div>
      );
    }
    case 'image':
      return (
        <div className="flex items-center gap-3">
          {str ? <img src={str} alt="" className="w-20 h-14 rounded-lg object-cover border border-border-subtle" /> : null}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-subtle border border-border-subtle text-xs font-semibold text-text-primary hover:border-terracotta/50 disabled:opacity-50">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            {str ? 'Replace' : 'Upload'}
          </button>
          {str && <button type="button" onClick={() => onChange(null)} className="text-[11px] font-semibold text-red-500">Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              try { onChange(await uploadCmsImage(f, entityForUpload)); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
            }} />
        </div>
      );
    default:
      return <input className={INPUT} value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.help} />;
  }
}

export function fieldLabel(field: FieldConfig) {
  return (
    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
      {field.label}{field.required && <span className="text-terracotta"> *</span>}
      {field.help && field.type !== 'json' && <span className="block text-[10px] font-normal text-text-muted mt-0.5">{field.help}</span>}
    </label>
  );
}
