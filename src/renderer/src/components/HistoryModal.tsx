import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { getRecords, clearRecords } from '../utils/history'
import type { HistoryRecord } from '../game/types'

interface Props {
  onClose: () => void
}

export default function HistoryModal({ onClose }: Props) {
  const { t } = useI18n()
  const [records, setRecords] = useState<HistoryRecord[]>(() => getRecords())
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClear = () => {
    clearRecords()
    setRecords([])
    setShowConfirm(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #4ecca3',
          borderRadius: 8,
          padding: 24,
          minWidth: 400,
          maxWidth: 500,
          maxHeight: '70vh',
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 20,
            cursor: 'pointer'
          }}
        >
          &times;
        </button>

        <h2 style={{ color: '#4ecca3', marginBottom: 16 }}>{t('history')}</h2>

        {records.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>{t('noHistory')}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={thStyle}>{t('score')}</th>
                <th style={thStyle}>{t('duration')}</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{r.score}</td>
                  <td style={tdStyle}>{r.duration}{t('seconds')}</td>
                  <td style={tdStyle}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              display: 'block',
              margin: '0 auto',
              padding: '6px 20px',
              fontSize: 14,
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {t('clear')}
          </button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#e94560', marginRight: 8, fontSize: 14 }}>{t('clearConfirm')}</span>
            <button onClick={handleClear} style={{ marginRight: 8, padding: '4px 12px' }}>{t('yes')}</button>
            <button onClick={() => setShowConfirm(false)} style={{ padding: '4px 12px' }}>{t('no')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { borderBottom: '1px solid #444', padding: 6, color: '#aaa', textAlign: 'left' }
const tdStyle: React.CSSProperties = { padding: 6, color: '#eee' }
