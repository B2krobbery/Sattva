import { Landmark, Flame, Calendar, Sparkles, Radio, HeartHandshake, Beef, Newspaper, FileText, type LucideIcon } from 'lucide-react';

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'money' | 'bool' | 'enum'
  | 'date' | 'datetime' | 'relation' | 'image' | 'days' | 'json' | 'uuid';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  i18n?: string;                       // also mirror value into this jsonb column as {en}
  options?: { value: string; label: string }[];
  relation?: { table: string; labelCol: string };
  default?: unknown;
  help?: string;
  group?: string;                      // section heading in the editor
}

export interface EntityConfig {
  id: string;
  table: string;
  label: string;
  singular: string;
  icon: LucideIcon;
  titleKey: string;                    // column used as row title
  hasStatus: boolean;
  fields: FieldConfig[];
  /** Non-form columns required NOT NULL at insert — merged into the payload. */
  defaults?: Record<string, unknown>;
}

const STATUS = { value: 'status', label: 'Status' };
const STATUS_OPTS = ['draft', 'published', 'archived'].map((v) => ({ value: v, label: v }));
const FEATURED: FieldConfig = { key: 'featured', label: 'Featured', type: 'bool', group: 'Publishing' };
const STATUS_FIELD: FieldConfig = { key: 'status', label: 'Status', type: 'enum', options: STATUS_OPTS, default: 'draft', group: 'Publishing' };
const TEMPLE_REL: FieldConfig = { key: 'temple_id', label: 'Temple', type: 'relation', required: true, relation: { table: 'temples', labelCol: 'name' }, group: 'Basics' };
const GAUSHALA_REL: FieldConfig = { key: 'gaushala_id', label: 'Gaushala', type: 'relation', required: true, relation: { table: 'gaushalas', labelCol: 'name' }, group: 'Basics' };
const IMAGE = (key = 'cover_image_url'): FieldConfig => ({ key, label: 'Image', type: 'image', group: 'Media' });

export const ENTITIES: EntityConfig[] = [
  {
    id: 'offerings', table: 'puja_offerings', label: 'Pujas', singular: 'Puja', icon: Flame,
    titleKey: 'name', hasStatus: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, i18n: 'name_i18n', group: 'Basics' },
      TEMPLE_REL,
      { key: 'offering_kind', label: 'Kind', type: 'enum', required: true, options: ['vazhipadu', 'archana', 'abhishekam', 'gau_grasam', 'gau_pooja', 'ghee_offering', 'special'].map((v) => ({ value: v, label: v.replace(/_/g, ' ') })), group: 'Basics' },
      { key: 'price', label: 'Price (₹)', type: 'money', default: 0, group: 'Basics' },
      { key: 'duration_min', label: 'Duration (min)', type: 'number', group: 'Basics' },
      { key: 'priest_name', label: 'Priest', type: 'text', group: 'Basics' },
      { key: 'description', label: 'Description', type: 'textarea', i18n: 'description_i18n', group: 'Content' },
      { key: 'significance', label: 'Significance', type: 'textarea', i18n: 'significance_i18n', group: 'Content' },
      { key: 'requires_sankalpa', label: 'Needs sankalpa', type: 'bool', group: 'Requirements' },
      { key: 'requires_nakshatra', label: 'Needs birth nakshatra', type: 'bool', group: 'Requirements' },
      { key: 'available_days', label: 'Available days', type: 'days', default: [0, 1, 2, 3, 4, 5, 6], group: 'Schedule' },
      { key: 'lead_time_days', label: 'Lead time (days)', type: 'number', default: 0, group: 'Schedule' },
      { key: 'max_per_day', label: 'Max per day', type: 'number', group: 'Schedule' },
      IMAGE('image_url'),
      { key: 'popular', label: 'Popular badge', type: 'bool', group: 'Publishing' },
      STATUS_FIELD,
    ],
    defaults: { currency: 'INR' },
  },
  {
    id: 'animals', table: 'animals', label: 'Cows', singular: 'Cow', icon: Beef,
    titleKey: 'name', hasStatus: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, group: 'Identity' },
      { key: 'tag_id', label: 'Tag ID', type: 'text', group: 'Identity' },
      { key: 'qr_code', label: 'QR Code', type: 'uuid', group: 'Identity' },
      GAUSHALA_REL,
      { key: 'breed_id', label: 'Breed', type: 'relation', relation: { table: 'breeds', labelCol: 'name' }, group: 'Identity' },
      { key: 'sex', label: 'Sex', type: 'enum', required: true, options: [{ value: 'female', label: 'female' }, { value: 'male', label: 'male' }, { value: 'bullock', label: 'bullock' }, { value: 'calf', label: 'calf' }], group: 'Identity' },
      { key: 'dob', label: 'Birth date', type: 'date', group: 'Identity' },
      { key: 'colour', label: 'Colour', type: 'text', group: 'Identity' },
      { key: 'health_status', label: 'Health', type: 'enum', options: ['healthy', 'under_treatment', 'critical', 'quarantine'].map((v) => ({ value: v, label: v.replace(/_/g, ' ') })), default: 'healthy', group: 'Care' },
      { key: 'acquisition_type', label: 'Acquisition', type: 'enum', options: ['born', 'donated', 'rescued', 'purchased'].map((v) => ({ value: v, label: v })), group: 'Care' },
      { key: 'acquired_at', label: 'Acquired on', type: 'date', group: 'Care' },
      { key: 'is_sacred_herd', label: 'Sacred herd', type: 'bool', group: 'Visibility' },
      { key: 'is_public', label: 'Public (sponsorable)', type: 'bool', default: true, group: 'Visibility' },
      { key: 'sponsorship_goal', label: 'Sponsorship goal (₹)', type: 'money', default: 0, group: 'Visibility' },
      { key: 'story', label: 'Story', type: 'textarea', i18n: 'story_i18n', group: 'Content' },
      IMAGE('image_url'),
      { key: 'status', label: 'Status', type: 'enum', options: ['active', 'deceased', 'transferred', 'sold'].map((v) => ({ value: v, label: v })), default: 'active', group: 'Publishing' },
    ],
    defaults: { sponsorship_raised: 0 },
  },
  {
    id: 'temples', table: 'temples', label: 'Temples', singular: 'Temple', icon: Landmark,
    titleKey: 'name', hasStatus: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, i18n: 'name_i18n', group: 'Basics' },
      { key: 'deity', label: 'Deity', type: 'text', i18n: 'deity_i18n', group: 'Basics' },
      { key: 'address', label: 'Address', type: 'textarea', group: 'Basics' },
      { key: 'district_id', label: 'District', type: 'relation', relation: { table: 'districts', labelCol: 'name' }, group: 'Basics' },
      { key: 'website', label: 'Website', type: 'text', group: 'Basics' },
      { key: 'live_stream_url', label: 'Live stream URL', type: 'text', group: 'Basics' },
      { key: 'has_gaushala', label: 'Has gaushala', type: 'bool', group: 'Basics' },
      { key: 'description', label: 'Description', type: 'textarea', i18n: 'description_i18n', group: 'Content' },
      { key: 'timings', label: 'Timings (JSON)', type: 'json', default: {}, help: 'e.g. {"darshan": "6AM–8PM"}', group: 'Content' },
      { key: 'contact', label: 'Contact (JSON)', type: 'json', default: {}, group: 'Content' },
      IMAGE(),
      FEATURED, STATUS_FIELD,
    ],
  },
  {
    id: 'events', table: 'events', label: 'Events', singular: 'Event', icon: Calendar,
    titleKey: 'title', hasStatus: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, i18n: 'title_i18n', group: 'Basics' },
      { key: 'temple_id', label: 'Temple', type: 'relation', relation: { table: 'temples', labelCol: 'name' }, group: 'Basics' },
      { key: 'gaushala_id', label: 'Gaushala', type: 'relation', relation: { table: 'gaushalas', labelCol: 'name' }, group: 'Basics' },
      { key: 'venue_name', label: 'Venue', type: 'text', group: 'Basics' },
      { key: 'venue_address', label: 'Venue address', type: 'text', group: 'Basics' },
      { key: 'starts_at', label: 'Starts', type: 'datetime', required: true, group: 'Schedule' },
      { key: 'ends_at', label: 'Ends', type: 'datetime', group: 'Schedule' },
      { key: 'is_free', label: 'Free entry', type: 'bool', default: true, group: 'Schedule' },
      { key: 'live_stream_url', label: 'Live stream URL', type: 'text', group: 'Schedule' },
      { key: 'description', label: 'Description', type: 'textarea', i18n: 'description_i18n', group: 'Content' },
      IMAGE(),
      FEATURED, STATUS_FIELD,
    ],
    defaults: { activities_i18n: {}, organiser: {} },
  },
  {
    id: 'festivals', table: 'festivals', label: 'Festivals', singular: 'Festival', icon: Sparkles,
    titleKey: 'name', hasStatus: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, i18n: 'name_i18n', group: 'Basics' },
      { key: 'month_hint', label: 'Month / season', type: 'text', help: 'e.g. "Margashirsha (Dec–Jan)"', group: 'Basics' },
      { key: 'summary', label: 'Summary', type: 'textarea', i18n: 'summary_i18n', group: 'Content' },
      { key: 'body', label: 'Full story', type: 'textarea', i18n: 'body_i18n', group: 'Content' },
      IMAGE(),
      FEATURED, STATUS_FIELD,
    ],
  },
  {
    id: 'streams', table: 'live_streams', label: 'Darshan Streams', singular: 'Stream', icon: Radio,
    titleKey: 'title', hasStatus: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, i18n: 'title_i18n', group: 'Basics' },
      { key: 'temple_id', label: 'Temple', type: 'relation', relation: { table: 'temples', labelCol: 'name' }, group: 'Basics' },
      { key: 'url', label: 'Stream URL', type: 'text', required: true, group: 'Basics' },
      { key: 'provider', label: 'Provider', type: 'text', default: 'website', help: 'youtube / website / facebook…', group: 'Basics' },
      { key: 'schedule', label: 'Schedule (JSON)', type: 'json', default: {}, help: 'e.g. {"daily": "6:00–8:00"}', group: 'Basics' },
      FEATURED, STATUS_FIELD,
    ],
  },
  {
    id: 'campaigns', table: 'seva_campaigns', label: 'Seva Campaigns', singular: 'Campaign', icon: HeartHandshake,
    titleKey: 'title', hasStatus: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, i18n: 'title_i18n', group: 'Basics' },
      { key: 'gaushala_id', label: 'Gaushala', type: 'relation', relation: { table: 'gaushalas', labelCol: 'name' }, group: 'Basics' },
      { key: 'goal_amount', label: 'Goal (₹)', type: 'money', default: 0, group: 'Basics' },
      { key: 'suggested_amounts', label: 'Suggested amounts (₹, comma-sep)', type: 'text', help: 'e.g. 51, 101, 251 — stored ×100', group: 'Basics' },
      { key: 'description', label: 'Description', type: 'textarea', i18n: 'description_i18n', group: 'Content' },
      IMAGE('image_url'),
      FEATURED, STATUS_FIELD,
    ],
    defaults: { suggested_amounts: [] },
  },
  {
    id: 'welfare', table: 'welfare_updates', label: 'Welfare Updates', singular: 'Welfare Post', icon: Newspaper,
    titleKey: 'title', hasStatus: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, i18n: 'title_i18n', group: 'Basics' },
      GAUSHALA_REL,
      { key: 'animal_id', label: 'Animal (optional)', type: 'relation', relation: { table: 'animals', labelCol: 'name' }, group: 'Basics' },
      { key: 'body', label: 'Story / update', type: 'textarea', i18n: 'body_i18n', group: 'Content' },
      IMAGE('image_url'),
      STATUS_FIELD,
    ],
    defaults: { published_at: '__now__' },
  },
  {
    id: 'editorial', table: 'editorial_blocks', label: 'Editorial', singular: 'Block', icon: FileText,
    titleKey: 'kind', hasStatus: true,
    fields: [
      { key: 'kind', label: 'Kind', type: 'text', required: true, help: 'e.g. daily_verse, festival_banner', group: 'Basics' },
      { key: 'for_date', label: 'For date', type: 'date', group: 'Basics' },
      { key: 'payload_i18n', label: 'Payload (JSON)', type: 'json', required: true, default: { en: '' }, help: '{"en": "…", "hi": "…"}', group: 'Content' },
      STATUS_FIELD,
    ],
  },
];

export const STATUS_LABELS = STATUS;
