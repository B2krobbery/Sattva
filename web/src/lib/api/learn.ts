import { supabase, localized } from '@/lib/supabase';

export interface Mantra {
  id: string;
  slug: string;
  name: string;
  devanagari?: string;
  deity?: string;
  transliteration?: string;
  meaning: string;
  audioUrl?: string;
  featured: boolean;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  sourceType?: 'purana' | 'itihasa' | 'agama' | 'temple_tradition' | 'acharya' | 'modern';
  claimType: 'scriptural' | 'traditional' | 'historical' | 'interpretation';
  category?: string;
  coverImageUrl?: string;
  featured: boolean;
  publishedAt?: string;
}

export async function getMantras(): Promise<Mantra[]> {
  const { data, error } = await supabase
    .from('mantras')
    .select('id,slug,name,name_devanagari,deity,transliteration,meaning_i18n,audio_url,featured')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    devanagari: r.name_devanagari || undefined,
    deity: r.deity || undefined,
    transliteration: r.transliteration || undefined,
    meaning: localized(r.meaning_i18n) || '',
    audioUrl: r.audio_url || undefined,
    featured: r.featured,
  }));
}

export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug,title_i18n,excerpt_i18n,level,source_type,claim_type,category,cover_image_url,featured,published_at')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: localized(r.title_i18n),
    excerpt: localized(r.excerpt_i18n),
    level: r.level,
    sourceType: r.source_type || undefined,
    claimType: r.claim_type,
    category: r.category || undefined,
    coverImageUrl: r.cover_image_url || undefined,
    featured: r.featured,
    publishedAt: r.published_at || undefined,
  }));
}

export interface ArticleDetail extends Article {
  body: string;
}

export async function getArticle(slug: string): Promise<ArticleDetail | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug,title_i18n,excerpt_i18n,body_i18n,level,source_type,claim_type,category,cover_image_url,published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: localized(data.title_i18n),
    excerpt: localized(data.excerpt_i18n),
    body: localized(data.body_i18n),
    level: data.level,
    sourceType: data.source_type || undefined,
    claimType: data.claim_type,
    category: data.category || undefined,
    coverImageUrl: data.cover_image_url || undefined,
    featured: false,
    publishedAt: data.published_at || undefined,
  };
}
