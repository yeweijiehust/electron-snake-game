import { createContext, useContext, useState, type ReactNode } from 'react'
import zh from './zh.json'
import en from './en.json'

type Lang = 'zh' | 'en'

const messages: Record<Lang, Record<string, string>> = { zh, en }

interface I18nContextType {
  lang: Lang
  t: (key: string) => string
  toggleLang: () => void
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  const toggleLang = () => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))
  }

  const t = (key: string): string => messages[lang][key] ?? key

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
