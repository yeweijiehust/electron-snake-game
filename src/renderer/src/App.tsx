import { useState, useEffect, useCallback, useRef } from 'react'
import { I18nProvider, useI18n } from './i18n/context'
import { saveRecord } from './utils/history'
import GameCanvas from './components/GameCanvas'
import HistoryModal from './components/HistoryModal'
import { CANVAS_SIZE } from './game/types'

type Screen = 'idle' | 'playing' | 'gameover'

function AppContent() {
  const [screen, setScreen] = useState<Screen>('idle')
  const [score, setScore] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const startTimeRef = useRef(0)
  const { t, toggleLang } = useI18n()

  const handleStart = useCallback(() => {
    setScore(0)
    startTimeRef.current = Date.now()
    setScreen('playing')
  }, [])

  const handleDeath = useCallback((finalScore: number) => {
    setScore(finalScore)
    const dur = Math.round((Date.now() - startTimeRef.current) / 1000)
    setDuration(dur)
    saveRecord({ score: finalScore, date: new Date().toLocaleString(), duration: dur })
    setScreen('gameover')
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        if (screen === 'idle' || screen === 'gameover') {
          handleStart()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen, handleStart])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f23',
        color: '#eee',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          width: CANVAS_SIZE + 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0'
        }}
      >
        <span style={{ fontSize: 22, color: '#4ecca3' }}>
          {t('score')}: {screen === 'idle' ? 0 : score}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggleLang} style={{ fontSize: 13, padding: '4px 10px' }}>
            {t('switchLang')}
          </button>
          <button onClick={() => setShowHistory(true)} style={{ fontSize: 13, padding: '4px 10px' }}>
            {t('history')}
          </button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <GameCanvas screen={screen} onDeath={handleDeath} onScoreChange={setScore} />

        {screen === 'idle' && (
          <div style={overlayStyle}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 40, color: '#4ecca3', marginBottom: 16 }}>{t('title')}</h1>
              <p style={{ fontSize: 18, color: '#ccc' }}>{t('start')}</p>
            </div>
          </div>
        )}

        {screen === 'gameover' && (
          <div style={overlayStyle}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 36, color: '#e94560', marginBottom: 12 }}>{t('gameOver')}</h1>
              <p style={{ fontSize: 22, color: '#4ecca3', marginBottom: 8 }}>
                {t('score')}: {score}
              </p>
              <p style={{ fontSize: 16, color: '#aaa', marginBottom: 20 }}>
                {t('duration')}: {duration}{t('seconds')}
              </p>
              <p style={{ fontSize: 16, color: '#888' }}>{t('restart')}</p>
            </div>
          </div>
        )}
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 2,
  background: 'rgba(15, 15, 35, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4
}

function App(): React.JSX.Element {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}

export default App
