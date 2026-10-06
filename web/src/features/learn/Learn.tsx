import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ArrowLeft, Landmark } from 'lucide-react';
import { getArticles, getArticle } from '@/lib/api/learn';
import { getSafeImageUrl, IMAGES } from '@/lib/images';
import './Learn.css';

const SOURCE_LABEL: Record<string, string> = {
  purana: 'Purāṇic', itihasa: 'Itihāsa', agama: 'Āgama',
  temple_tradition: 'Temple tradition', acharya: 'Āchārya', modern: 'Modern',
};
const CLAIM_LABEL: Record<string, string> = {
  scriptural: 'Scriptural', traditional: 'Traditional',
  historical: 'Historical', interpretation: 'Interpretation',
};

export function Learn() {
  const { data: articles, isLoading, isError } = useQuery({ queryKey: ['articles'], queryFn: getArticles });
  const categories = [...new Set((articles ?? []).map((a) => a.category).filter(Boolean))];

  return (
    <div className="learn-page">
      <section className="learn-hero">
        <span className="badge-gold">Sanātana Knowledge</span>
        <h1 className="typography-headline-lg">Learn the why, not just the what.</h1>
        <p>Short, honest explainers grounded in scripture and temple tradition — with sources labelled, not hand-waved.</p>
      </section>

      {isLoading && <div className="discover-state">Opening the library…</div>}
      {isError && <div className="discover-state discover-error">Could not load the knowledge library.</div>}

      {categories.map((cat) => (
        <section key={cat} className="learn-group">
          <div className="learn-group-head">
            <BookOpen size={16} className="text-terracotta" />
            <h2>{cat}</h2>
          </div>
          <div className="learn-grid">
            {(articles ?? []).filter((a) => a.category === cat).map((a) => (
              <Link key={a.id} to={`/learn/${a.slug}`} className="learn-card">
                {a.coverImageUrl && (
                  <img src={getSafeImageUrl(a.coverImageUrl, IMAGES.pujas.templeHero)} alt="" loading="lazy" className="learn-card-img" />
                )}
                <div className="learn-card-body">
                  <div className="learn-card-badges">
                    <span className="learn-badge learn-badge-level">{a.level}</span>
                    {a.sourceType && <span className="learn-badge">{SOURCE_LABEL[a.sourceType] ?? a.sourceType}</span>}
                    <span className="learn-badge learn-badge-claim">{CLAIM_LABEL[a.claimType] ?? a.claimType}</span>
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {!isLoading && !isError && (articles ?? []).length === 0 && (
        <div className="discover-empty"><Landmark size={20} style={{ marginBottom: 6 }} /><br />The library is being curated.</div>
      )}
    </div>
  );
}

export function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => getArticle(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <div className="discover-state">Opening the page…</div>;
  if (isError || !article) return <div className="discover-state discover-error">This page could not be found.</div>;

  return (
    <article className="article-page">
      <Link to="/learn" className="article-back"><ArrowLeft size={15} /> All articles</Link>
      {article.coverImageUrl && (
        <img src={getSafeImageUrl(article.coverImageUrl, IMAGES.pujas.templeHero)} alt="" className="article-cover" />
      )}
      <div className="article-meta">
        {article.category && <span className="learn-badge">{article.category}</span>}
        <span className="learn-badge learn-badge-level">{article.level}</span>
        {article.sourceType && <span className="learn-badge">{SOURCE_LABEL[article.sourceType] ?? article.sourceType}</span>}
        <span className="learn-badge learn-badge-claim">{CLAIM_LABEL[article.claimType] ?? article.claimType}</span>
      </div>
      <h1 className="article-title">{article.title}</h1>
      <p className="article-excerpt">{article.excerpt}</p>
      <div className="article-body">
        {article.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
      </div>
      <p className="article-source-note">
        Sources on Pratha are labelled by kind — {CLAIM_LABEL[article.claimType]?.toLowerCase() || 'traditional'}
        {article.sourceType ? ` material from ${SOURCE_LABEL[article.sourceType]?.toLowerCase()}` : ''}.
        Tradition speaks; we annotate honestly.
      </p>
    </article>
  );
}
