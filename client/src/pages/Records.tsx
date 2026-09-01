import { useEffect, useState } from 'react'
import { FileText, Plus, Trash2, CircleCheck as CheckCircle, Pill, FlaskConical, File, Download, Link2, ShieldCheck, ShieldAlert, Loader as LoaderIcon, Paperclip, Eye, X, UploadCloud } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import type { HealthRecord } from '../lib/types'
import { getChainStatus, anchorHealthRecord, verifyHealthRecord, uploadHealthRecordFileToIpfs, type ChainStatus, type VerifyResult } from '../lib/blockchain'

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function exportRecordAsPdf(record: HealthRecord) {
  const rec = {
    ...record,
    title: escapeHtml(record.title),
    type: escapeHtml(record.type),
    date: escapeHtml(record.date),
    doctor: record.doctor ? escapeHtml(record.doctor) : record.doctor,
    hospital: record.hospital ? escapeHtml(record.hospital) : record.hospital,
    notes: record.notes ? escapeHtml(record.notes) : record.notes,
  }
  const w = window.open('', '_blank', 'width=700,height=900')
  if (!w) return
  w.document.write(`
    <html>
      <head>
        <title>${rec.title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #101828; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #f2f4f7; font-size: 12px; font-weight: 600; text-transform: capitalize; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
          td:first-child { color: #667085; width: 140px; font-weight: 600; }
          .notes { margin-top: 20px; font-size: 14px; color: #344054; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${rec.title}</h1>
        <span class="badge">${rec.type}</span>
        <table>
          <tr><td>Date</td><td>${rec.date}</td></tr>
          ${rec.doctor ? `<tr><td>Doctor</td><td>${rec.doctor}</td></tr>` : ''}
          ${rec.hospital ? `<tr><td>Hospital</td><td>${rec.hospital}</td></tr>` : ''}
        </table>
        ${rec.notes ? `<div class="notes"><strong>Notes:</strong><br/>${rec.notes}</div>` : ''}
      </body>
    </html>
  `)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}

const typeIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  prescription: Pill, report: FlaskConical, document: File, discharge: FileText, scan: FileText,
}

// `file_url` is stored as a base64 data: URL (see MAX_FILE_BYTES note below).
// Browsers block navigating a new tab directly to a data: URL for security
// reasons, so clicking a plain <a href="data:..."> silently does nothing in
// Chrome/Edge. To actually view the file we convert the data URL to a Blob
// and open a short-lived object URL instead, which browsers allow.
function openDataUrl(dataUrl: string) {
  try {
    const [meta, base64] = dataUrl.split(',')
    const mimeMatch = meta.match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const objectUrl = URL.createObjectURL(blob)
    window.open(objectUrl, '_blank')
    // Revoke after a delay so the new tab has time to load the file first.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
  } catch {
    window.open(dataUrl, '_blank')
  }
}

// Same limit/approach as the avatar upload in Settings.tsx: read the file as a
// base64 data URL client-side and store it directly on the record (no
// separate file-storage service in this app). Documents are allowed a bit
// more room than the profile picture since scans/PDFs are usually bigger.
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.webp'

export default function Records() {
  const { data: records, refetch, loading, error } = useSupabaseQuery<HealthRecord>('health_records', '*', 'date', false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ title: '', type: 'document', date: '', doctor: '', hospital: '', notes: '', file_url: null as string | null })
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [chainStatus, setChainStatus] = useState<ChainStatus | null>(null)
  const [chainBusyId, setChainBusyId] = useState<string | null>(null)
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({})
  const [chainError, setChainError] = useState<string | null>(null)

  useEffect(() => {
    getChainStatus().then(setChainStatus).catch(() => setChainStatus(null))
  }, [])

  const types = ['all', 'prescription', 'report', 'document', 'discharge', 'scan']
  const filtered = records?.filter((r) => filter === 'all' || r.type === filter) ?? []

  const handleAnchor = async (id: string) => {
    setChainError(null)
    setChainBusyId(id)
    try {
      await anchorHealthRecord(id)
      await refetch()
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Failed to anchor record on-chain')
    } finally {
      setChainBusyId(null)
    }
  }

  // Pins the record's locally-stored file (currently a base64 data: URL) to
  // IPFS via the backend, storing the resulting CID + gateway URL on the
  // record. Do this before anchoring so the anchor transaction includes the
  // CID on-chain (see anchorHealthRecord / blockchain.js).
  const handleUploadToIpfs = async (rec: HealthRecord) => {
    if (!rec.file_url) return
    setChainError(null)
    setChainBusyId(rec.id)
    try {
      await uploadHealthRecordFileToIpfs(rec.id, rec.file_url, rec.title)
      await refetch()
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Failed to upload file to IPFS')
    } finally {
      setChainBusyId(null)
    }
  }

  const handleVerify = async (id: string) => {
    setChainError(null)
    setChainBusyId(id)
    try {
      const result = await verifyHealthRecord(id)
      setVerifyResults((prev) => ({ ...prev, [id]: result }))
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Failed to verify record on-chain')
    } finally {
      setChainBusyId(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setFileError(null)
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, file_url: reader.result as string }))
      setFileName(file.name)
    }
    reader.onerror = () => setFileError('Could not read that file')
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setForm((f) => ({ ...f, file_url: null }))
    setFileName(null)
    setFileError(null)
  }

  const addRecord = async () => {
    if (!form.title || !form.date) return
    const { error } = await db.from('health_records').insert({
      title: form.title, type: form.type, date: form.date,
      doctor: form.doctor || null, hospital: form.hospital || null, notes: form.notes || null,
      file_url: form.file_url || null,
    })
    if (error) return
    setSuccess(true); refetch()
    setForm({ title: '', type: 'document', date: '', doctor: '', hospital: '', notes: '', file_url: null })
    setFileName(null)
    setFileError(null)
  }

  const deleteRecord = async (id: string) => {
    await db.from('health_records').delete().eq('id', id)
    refetch()
  }

  if (loading) return <div><PageHeader title="Health Records" subtitle="Store and manage your medical documents" icon={FileText} /><LoadingState /></div>
  if (error) return <div><PageHeader title="Health Records" subtitle="Store and manage your medical documents" icon={FileText} /><ErrorState message={error} /></div>

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fade-in">
      <PageHeader title="Health Records" subtitle="Store and manage your medical documents" icon={FileText} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Records' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => { setModalOpen(true); setSuccess(false) }}><Plus size={18} /> Add Record</button>
      </div>

      {chainStatus && !chainStatus.configured && (
        <div className="card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Blockchain verification isn't set up on this server yet (no contract deployed). See <code>blockchain/README.md</code> to enable it.
        </div>
      )}
      {chainError && (
        <div className="card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--error-500)' }}>
          {chainError}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No health records" subtitle="Add prescriptions, lab reports, discharge summaries, and other medical documents." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((rec) => {
            const Icon = typeIcons[rec.type] || File
            return (
              <div key={rec.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: 'var(--primary-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon size={20} color="var(--primary-500)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: 15, marginBottom: 2 }}>{rec.title}</h4>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{rec.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportRecordAsPdf(rec)} title="Export as PDF" style={{ padding: 4 }}><Download size={16} color="var(--text-muted)" /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteRecord(rec.id)} style={{ padding: 4 }}><Trash2 size={16} color="var(--error-500)" /></button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span><strong>Date:</strong> {rec.date}</span>
                  {rec.doctor && <span><strong>Doctor:</strong> {rec.doctor}</span>}
                  {rec.hospital && <span><strong>Hospital:</strong> {rec.hospital}</span>}
                  {rec.notes && <span style={{ marginTop: 4, color: 'var(--text-muted)' }}>{rec.notes}</span>}
                  {rec.file_url && (
                    <button
                      type="button"
                      onClick={() => {
                        // Once uploaded to IPFS, file_url is a real https:// gateway
                        // link and can be opened directly; before that it's a
                        // base64 data: URL, which needs the Blob workaround.
                        if (rec.file_url!.startsWith('data:')) openDataUrl(rec.file_url as string)
                        else window.open(rec.file_url as string, '_blank')
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content', color: 'var(--primary-500)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                    >
                      <Eye size={13} /> View attached file
                    </button>
                  )}
                  {rec.ipfs_cid && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Stored on IPFS: <code>{rec.ipfs_cid.slice(0, 10)}…</code>
                    </span>
                  )}
                </div>

                {chainStatus?.configured && (
                  <div style={{ borderTop: '1px solid var(--border, #eee)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {chainStatus.ipfsConfigured && rec.file_url?.startsWith('data:') && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12, padding: '2px 8px', width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        disabled={chainBusyId === rec.id}
                        onClick={() => handleUploadToIpfs(rec)}
                      >
                        {chainBusyId === rec.id ? <LoaderIcon size={12} className="spin" /> : <UploadCloud size={12} />}
                        {chainBusyId === rec.id ? 'Uploading...' : 'Upload file to IPFS'}
                      </button>
                    )}
                    {rec.chain_tx_hash ? (
                      <>
                        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          <Link2 size={12} /> Anchored on Sepolia
                        </span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <a
                            href={`${chainStatus.explorerBase}/tx/${rec.chain_tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: 'var(--primary-500)' }}
                          >
                            View transaction
                          </a>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 12, padding: '2px 8px' }}
                            disabled={chainBusyId === rec.id}
                            onClick={() => handleVerify(rec.id)}
                          >
                            {chainBusyId === rec.id ? <LoaderIcon size={12} className="spin" /> : 'Verify integrity'}
                          </button>
                        </div>
                        {verifyResults[rec.id] && (
                          <span
                            style={{
                              fontSize: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: verifyResults[rec.id].matches ? 'var(--success-500)' : 'var(--error-500)',
                            }}
                          >
                            {verifyResults[rec.id].matches ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                            {verifyResults[rec.id].matches
                              ? 'Matches on-chain hash - unaltered since anchoring.'
                              : 'Does NOT match on-chain hash - record was changed after anchoring.'}
                          </span>
                        )}
                        {verifyResults[rec.id]?.onChainFileCID && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            On-chain file CID: <code>{verifyResults[rec.id].onChainFileCID}</code>
                          </span>
                        )}
                      </>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12, padding: '2px 8px', width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        disabled={chainBusyId === rec.id}
                        onClick={() => handleAnchor(rec.id)}
                      >
                        {chainBusyId === rec.id ? <LoaderIcon size={12} className="spin" /> : <Link2 size={12} />}
                        {chainBusyId === rec.id ? 'Anchoring...' : 'Anchor on blockchain'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSuccess(false) }}
        title={success ? 'Record Added!' : 'Add Health Record'}
        footer={success ? <button className="btn btn-primary" onClick={() => { setModalOpen(false); setSuccess(false) }}>Done</button>
          : <><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={addRecord} disabled={!form.title || !form.date}>Save Record</button></>}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="var(--success-500)" />
            </div>
            <p>Your health record has been saved.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Blood Test Report" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="label">Type</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="document">Document</option><option value="prescription">Prescription</option><option value="report">Lab Report</option><option value="discharge">Discharge Summary</option><option value="scan">Scan/X-Ray</option></select></div>
              <div><label className="label">Date *</label><input className="input" type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="label">Doctor</label><input className="input" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} placeholder="Doctor name" /></div>
              <div><label className="label">Hospital</label><input className="input" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} placeholder="Hospital name" /></div>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes" /></div>

            <div>
              <label className="label">Attach file (PDF or image, optional)</label>
              {form.file_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <Paperclip size={14} color="var(--text-muted)" />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={removeFile}>
                    <X size={14} color="var(--error-500)" />
                  </button>
                </div>
              ) : (
                <label className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <Paperclip size={16} /> Choose file
                  <input type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} style={{ display: 'none' }} />
                </label>
              )}
              {fileError && <div style={{ fontSize: 12, color: 'var(--error-500)', marginTop: 4 }}>{fileError}</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
