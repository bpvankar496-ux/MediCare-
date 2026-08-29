import { useState } from 'react'
import { Users, Plus, Trash2, Heart, Phone, CircleCheck as CheckCircle } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import type { FamilyMember } from '../lib/types'

export default function Family() {
  const { data: members, refetch, loading, error } = useSupabaseQuery<FamilyMember>('family_members', '*', 'created_at', false)
  const [modalOpen, setModalOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', relation: '', age: '', gender: 'male', blood_group: '', conditions: '', allergies: '', phone: '' })

  const addMember = async () => {
    if (!form.name || !form.relation) return
    const { error } = await db.from('family_members').insert({
      name: form.name, relation: form.relation,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      blood_group: form.blood_group || null,
      conditions: form.conditions ? form.conditions.split(',').map((s) => s.trim()) : [],
      allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()) : [],
      phone: form.phone || null,
    })
    if (error) return
    setSuccess(true); refetch()
    setForm({ name: '', relation: '', age: '', gender: 'male', blood_group: '', conditions: '', allergies: '', phone: '' })
  }

  const deleteMember = async (id: string) => { await db.from('family_members').delete().eq('id', id); refetch() }

  if (loading) return <div><PageHeader title="Family Members" subtitle="Manage health profiles for your family" icon={Users} /><LoadingState /></div>
  if (error) return <div><PageHeader title="Family Members" subtitle="Manage health profiles for your family" icon={Users} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title="Family Members" subtitle="Manage health profiles for your family" icon={Users} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => { setModalOpen(true); setSuccess(false) }}><Plus size={18} /> Add Member</button>
      </div>

      {members && members.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }} className="family-grid">
          {members.map((m) => (
            <div key={m.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: 'var(--primary-50)', display: 'grid', placeItems: 'center',
                  fontSize: 20, fontWeight: 700, color: 'var(--primary-600)',
                }}>{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ marginBottom: 2 }}>{m.name}</h4>
                  <span className="badge badge-info">{m.relation}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteMember(m.id)} style={{ padding: 4 }}><Trash2 size={16} color="var(--error-500)" /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text)' }}>
                {m.age && <span>Age: {m.age}</span>}
                {m.gender && <span style={{ textTransform: 'capitalize' }}>Gender: {m.gender}</span>}
                {m.blood_group && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Heart size={13} color="var(--error-500)" /> Blood Group: {m.blood_group}</span>}
                {m.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} color="var(--text-muted)" /> {m.phone}</span>}
              </div>
              {m.conditions.length > 0 && (
                <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Conditions</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{m.conditions.map((c) => <span key={c} className="badge badge-warning">{c}</span>)}</div></div>
              )}
              {m.allergies.length > 0 && (
                <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Allergies</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{m.allergies.map((a) => <span key={a} className="badge badge-error">{a}</span>)}</div></div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No family members" subtitle="Add family members to track their health profiles, conditions, and allergies." />
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSuccess(false) }}
        title={success ? 'Member Added!' : 'Add Family Member'}
        footer={success ? <button className="btn btn-primary" onClick={() => { setModalOpen(false); setSuccess(false) }}>Done</button>
          : <><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={addMember} disabled={!form.name || !form.relation}>Save</button></>}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><CheckCircle size={28} color="var(--success-500)" /></div>
            <p>Family member has been added.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="form-grid-2">
              <div><label className="label">Relation *</label><input className="input" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="e.g. Spouse, Son" /></div>
              <div><label className="label">Age</label><input className="input" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Age" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="form-grid-2">
              <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              <div><label className="label">Blood Group</label><input className="input" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="e.g. O+" /></div>
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></div>
            <div><label className="label">Conditions (comma-separated)</label><input className="input" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="e.g. Diabetes, Hypertension" /></div>
            <div><label className="label">Allergies (comma-separated)</label><input className="input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Peanuts" /></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
