import { useState, useMemo } from 'react'
import { BookOpen, Search, Clock, User } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, EmptyState, Modal } from '../lib/ui'
import type { Article } from '../lib/types'
import { useI18n } from '../lib/i18n'

export default function Articles() {
  const { t } = useI18n()
  const { data: articles, loading, error } = useSupabaseQuery<Article>('articles', '*', 'published_at', false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selected, setSelected] = useState<Article | null>(null)

  const categories = useMemo(() => { const set = new Set(articles?.map((a) => a.category) ?? []); return ['all', ...Array.from(set).sort()] }, [articles])
  const filtered = useMemo(() => {
    if (!articles) return []
    return articles.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.excerpt.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
      return true
    })
  }, [articles, search, categoryFilter])

  if (loading) return <div><PageHeader title={t('ph_articles_title')} subtitle={t('ph_articles_subtitle')} icon={BookOpen} /><LoadingState /></div>
  if (error) return <div><PageHeader title={t('ph_articles_title')} subtitle={t('ph_articles_subtitle')} icon={BookOpen} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title={t('ph_articles_title')} subtitle={t('ph_articles_subtitle')} icon={BookOpen} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No articles found" subtitle="Try a different search or category." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }} className="articles-grid">
          {filtered.map((a) => (
            <div key={a.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setSelected(a)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={{ height: 120, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))', display: 'grid', placeItems: 'center' }}>
                <BookOpen size={32} color="var(--primary-300)" />
              </div>
              <span className="badge badge-info" style={{ alignSelf: 'flex-start' }}>{a.category}</span>
              <h4 style={{ fontSize: 16, lineHeight: 1.3 }}>{a.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1, lineHeight: 1.5 }}>{a.excerpt}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {a.author && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {a.author}</span>}
                {a.read_time && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {a.read_time}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''}
        footer={<button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="badge badge-info">{selected.category}</span>
              {selected.author && <span className="badge badge-neutral">{selected.author}</span>}
              {selected.read_time && <span className="badge badge-neutral">{selected.read_time}</span>}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{selected.content}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
