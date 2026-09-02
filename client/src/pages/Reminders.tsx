import { useState, useEffect, useRef } from 'react'
import { BellRing, Plus, Trash2, Clock, Bell, BellOff } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import type { Reminder } from '../lib/types'
import { useI18n } from '../lib/i18n'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayAbbrev = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function useReminderNotifications(reminders: Reminder[] | null) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const firedRef = useRef<Set<string>>(new Set())

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  useEffect(() => {
    if (permission !== 'granted' || !reminders) return
    const check = () => {
      const now = new Date()
      const hhmm = now.toTimeString().slice(0, 5)
      const today = dayAbbrev[now.getDay()]
      const key = `${now.toDateString()}-${hhmm}`
      reminders.forEach((r) => {
        if (!r.active || r.time !== hhmm) return
        if (r.frequency === 'weekly' && !r.days.includes(today)) return
        const fireKey = `${r.id}-${key}`
        if (firedRef.current.has(fireKey)) return
        firedRef.current.add(fireKey)
        new Notification(r.title, { body: r.notes || `It's time: ${r.type}`, icon: '/favicon.svg' })
      })
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [reminders, permission])

  return { permission, requestPermission }
}

export default function Reminders() {
  const { t } = useI18n()
  const { data: reminders, refetch, loading, error } = useSupabaseQuery<Reminder>('reminders', '*', 'created_at', false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'medicine', time: '08:00', frequency: 'daily', days: [] as string[], notes: '' })
  const { permission, requestPermission } = useReminderNotifications(reminders)

  const addReminder = async () => {
    if (!form.title) return
    const { error } = await db.from('reminders').insert({
      title: form.title, type: form.type, time: form.time,
      frequency: form.frequency, days: form.frequency === 'weekly' ? form.days : [],
      active: true, notes: form.notes || null,
    })
    if (error) return
    refetch(); setModalOpen(false)
    setForm({ title: '', type: 'medicine', time: '08:00', frequency: 'daily', days: [], notes: '' })
  }

  const toggleActive = async (r: Reminder) => { await db.from('reminders').update({ active: !r.active }).eq('id', r.id); refetch() }
  const deleteReminder = async (id: string) => { await db.from('reminders').delete().eq('id', id); refetch() }

  if (loading) return <div><PageHeader title={t('ph_reminders_title')} subtitle={t('ph_reminders_subtitle')} icon={BellRing} /><LoadingState /></div>
  if (error) return <div><PageHeader title={t('ph_reminders_title')} subtitle={t('ph_reminders_subtitle')} icon={BellRing} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title={t('ph_reminders_title')} subtitle={t('ph_reminders_subtitle')} icon={BellRing} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        {permission === 'granted' ? (
          <span className="badge badge-success"><Bell size={13} /> {t('rm_notifications_on')}</span>
        ) : permission === 'denied' ? (
          <span className="badge badge-neutral"><BellOff size={13} /> {t('rm_notifications_blocked')}</span>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={requestPermission}><Bell size={15} /> {t('rm_enable_notifications')}</button>
        )}
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> {t('rm_add_reminder')}</button>
      </div>

      {reminders && reminders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reminders.map((r) => (
            <div key={r.id} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, opacity: r.active ? 1 : 0.6 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                background: r.type === 'medicine' ? 'var(--secondary-50)' : 'var(--primary-50)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <BellRing size={20} color={r.type === 'medicine' ? 'var(--secondary-500)' : 'var(--primary-500)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-h)' }}>{r.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {r.time}</span>
                  <span style={{ textTransform: 'capitalize' }}>{r.frequency}</span>
                  {r.days.length > 0 && <span>{r.days.join(', ')}</span>}
                  <span style={{ textTransform: 'capitalize' }}>{r.type}</span>
                </div>
                {r.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.notes}</div>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(r)} style={{ minWidth: 80 }}>
                {r.active ? <span className="badge badge-success">{t('rm_active')}</span> : <span className="badge badge-neutral">{t('rm_paused')}</span>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => deleteReminder(r.id)} style={{ padding: 4 }}><Trash2 size={16} color="var(--error-500)" /></button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={BellRing} title={t('rm_empty_title')} subtitle={t('rm_empty_subtitle')} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('rm_modal_title')}
        footer={<><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t('rm_cancel')}</button><button className="btn btn-primary" onClick={addReminder} disabled={!form.title}>{t('rm_save')}</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="label">{t('rm_field_title')}</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('rm_field_title_placeholder')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">{t('rm_field_type')}</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="medicine">{t('rm_opt_medicine')}</option><option value="appointment">{t('rm_opt_appointment')}</option><option value="checkup">{t('rm_opt_checkup')}</option><option value="exercise">{t('rm_opt_exercise')}</option><option value="other">{t('rm_opt_other')}</option></select></div>
            <div><label className="label">{t('rm_field_time')}</label><input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          </div>
          <div><label className="label">{t('rm_field_frequency')}</label><select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value, days: [] })}><option value="daily">{t('rm_opt_daily')}</option><option value="weekly">{t('rm_opt_weekly')}</option><option value="once">{t('rm_opt_once')}</option></select></div>
          {form.frequency === 'weekly' && (
            <div>
              <label className="label">{t('rm_field_days')}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {days.map((d) => (
                  <button key={d} onClick={() => setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] })}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', background: form.days.includes(d) ? 'var(--primary-500)' : 'var(--surface)', color: form.days.includes(d) ? 'white' : 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div><label className="label">{t('vt_col_notes')}</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('rm_field_notes_placeholder')} /></div>
        </div>
      </Modal>
    </div>
  )
}
