# 08 — Internationalization (i18n) with React Context

## Overview

This tutorial covers how the Snake game supports **two languages** (Chinese and English) using **React Context**. You'll learn how the `I18nProvider` wraps the entire app, how translations are stored in JSON files, and how the `useI18n` hook makes translations accessible in any component.

By the end of this tutorial, you'll understand:

- What React Context is and why it's useful
- How the i18n Provider/Consumer pattern works
- How translations are stored in JSON dictionaries
- How the language toggle button updates the UI

---

## Prerequisites

- **React basics** — components, props, hooks
- **React Context** — basic understanding (created in this tutorial from scratch)
- Completion of **[04-react-hooks-and-state.md](04-react-hooks-and-state.md)**

---

## What is React Context?

**React Context** is a way to share data across the entire component tree without passing props through every level.

### The Prop Drilling Problem

Without Context, passing data from a top-level component to a deeply nested one looks like this:

```typescript
function App() {
  const [lang, setLang] = useState('zh')
  return <Menu lang={lang} onToggle={setLang} />
}

function Menu({ lang, onToggle }: { lang: string; onToggle: (l: string) => void }) {
  return <GameOverlay lang={lang} onToggle={onToggle} />
}

function GameOverlay({ lang, onToggle }: { lang: string; onToggle: (l: string) => void }) {
  return <button onClick={() => onToggle('en')}>{lang}</button>
}
```

Every intermediate component must pass `lang` and `onToggle` even if it doesn't use them. This is **prop drilling**.

### Context Solves This

```
App
  │  ┌─ I18nProvider ────────────────────┐
  │  │  value = { lang, t, toggleLang }  │
  │  │                                    │
  │  │  Menu (reads via useI18n hook)     │
  │  │  GameOverlay (reads via useI18n)   │
  │  │  AnyComponent (reads via useI18n)  │
  │  └────────────────────────────────────┘
```

Any component inside the Provider can access the i18n data directly, without prop drilling.

---

## The Translation Files

### Chinese — `src/renderer/src/i18n/zh.json`

```json
{
  "title": "贪吃蛇",
  "start": "按 空格键 开始游戏",
  "gameOver": "游戏结束",
  "score": "分数",
  "duration": "用时",
  "seconds": "秒",
  "restart": "按 空格键 重新开始",
  "history": "历史记录",
  "noHistory": "暂无记录",
  "clear": "清空",
  "clearConfirm": "确定要删除所有历史记录吗？",
  "yes": "是",
  "no": "否",
  "switchLang": "English",
  "playAgain": "再来一局"
}
```

### English — `src/renderer/src/i18n/en.json`

```json
{
  "title": "Snake",
  "start": "Press SPACE to start",
  "gameOver": "Game Over",
  "score": "Score",
  "duration": "Duration",
  "seconds": "s",
  "restart": "Press SPACE to restart",
  "history": "History",
  "noHistory": "No records",
  "clear": "Clear",
  "clearConfirm": "Delete all history records?",
  "yes": "Yes",
  "no": "No",
  "switchLang": "中文",
  "playAgain": "Play Again"
}
```

### Key Pattern: switchLang

Notice how `"switchLang"` contains the **other** language's name:

- In `zh.json`: `"switchLang": "English"` — the button shows "English" to switch TO English
- In `en.json`: `"switchLang": "中文"` — the button shows "中文" to switch TO Chinese

This is a common UX pattern: the button always shows the language you'll switch **to**, not the current one.

---

## The i18n Context (`src/renderer/src/i18n/context.tsx`)

### Step 1: Define Types and Import Dictionaries

```typescript
// src/renderer/src/i18n/context.tsx:1-7
import { createContext, useContext, useState, type ReactNode } from 'react'
import zh from './zh.json'
import en from './en.json'

type Lang = 'zh' | 'en'

const messages: Record<Lang, Record<string, string>> = { zh, en }
```

`messages` is a lookup table: given a language key (`'zh'` or `'en'`), return the entire dictionary of key-value pairs.

### Step 2: Define the Context Type

```typescript
// src/renderer/src/i18n/context.tsx:9-14
interface I18nContextType {
  lang: Lang
  t: (key: string) => string
  toggleLang: () => void
}
```

The context provides three things:

| Member | Type | Purpose |
|--------|------|---------|
| `lang` | `'zh' \| 'en'` | Current language |
| `t` | `(key: string) => string` | Translate a key to the current language |
| `toggleLang` | `() => void` | Switch between languages |

### Step 3: Create the Context

```typescript
// src/renderer/src/i18n/context.tsx:16
const I18nContext = createContext<I18nContextType | null>(null)
```

`createContext` creates a context object with a default value (`null`). When a component uses this context and there's no Provider above it, it gets `null`.

### Step 4: Create the Provider Component

```typescript
// src/renderer/src/i18n/context.tsx:18-29
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
```

#### What the Provider Does

1. **`useState<Lang>('zh')`** — starts with Chinese
2. **`toggleLang`** — toggles between `'zh'` and `'en'`
3. **`t(key)`** — looks up the key in the current language's dictionary. If the key is missing, returns the key itself as a fallback (useful during development if a key hasn't been translated yet)
4. **`I18nContext.Provider`** — makes `{ lang, t, toggleLang }` available to all descendants

#### The `??` Operator

```typescript
messages[lang][key] ?? key
```

The **nullish coalescing operator** `??` returns the right side only if the left is `null` or `undefined`. This is different from `||` which would also return the right side for falsy values like `''` or `0`.

### Step 5: Create the Consumer Hook

```typescript
// src/renderer/src/i18n/context.tsx:31-35
export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
```

**`useContext`** subscribes to a context and returns its current value. The error check (`if (!ctx)`) provides a clear error message if someone forgets to wrap the component in `I18nProvider`.

---

## Using i18n in Components

### Wrapping the App

```typescript
// src/renderer/src/App.tsx:2
import { I18nProvider, useI18n } from './i18n/context'

function App(): React.JSX.Element {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}
```

### Using the Hook

```typescript
// Inside AppContent or any child component
const { t, toggleLang } = useI18n()

// Usage in JSX:
<h1>{t('title')}</h1>             {/* "贪吃蛇" or "Snake" */}
<p>{t('start')}</p>               {/* "按 空格键 开始游戏" or "Press SPACE to start" */}
<button onClick={toggleLang}>     {/* Toggle button */}
  {t('switchLang')}               {/* "English" or "中文" */}
</button>
```

### The Language Toggle Button

In the score bar (always visible):

```typescript
<button onClick={toggleLang}>
  {t('switchLang')}
</button>
```

When in Chinese mode, `t('switchLang')` returns `"English"`. Clicking it switches to English mode, and now `t('switchLang')` returns `"中文"`.

---

## Context vs Alternatives

| Approach | Pros | Cons |
|----------|------|------|
| **React Context** (this project) | Simple, no dependencies, built into React | Re-renders all consumers when value changes |
| **react-i18next** | Enterprise-grade, lazy loading, pluralization | Extra dependency, heavier setup |
| **Prop drilling** | Explicit data flow | Tedious for deeply nested components |
| **Global singleton** | Simple | No reactivity, hard to test |

For a small game with only two languages, React Context is the perfect lightweight solution.

---

## How Translation Works End-to-End

```
User clicks "English" button
        │
        ▼
toggleLang() → setLang('en')
        │
        ▼
React re-renders the component tree
        │
        ▼
Every useI18n() hook gets the new context
        │
        ▼
t('title') → messages['en']['title'] → "Snake"
t('start') → messages['en']['start'] → "Press SPACE to start"
        │
        ▼
UI updates instantly
```

---

## Key Takeaways

1. **React Context** shares data across the component tree without prop drilling
2. **`I18nProvider`** wraps the entire app and provides language state
3. **JSON files** store key-value pairs for each language
4. **`useI18n()` hook** provides `t()` for translation and `toggleLang()` for switching
5. **`t(key)`** looks up the key in the current dictionary, with a fallback to the key itself
6. **The switchLang pattern** shows the target language name on the button
7. **Zero external dependencies** — the entire i18n system is ~35 lines of React code

---

## What's Next

Now you understand how the UI adapts to different languages. The next tutorial **[09-localStorage-history.md](09-localStorage-history.md)** covers how game history is saved to the browser's localStorage and displayed in a modal.
