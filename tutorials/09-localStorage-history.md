# 09 — Saving Game History with localStorage

## Overview

This tutorial covers how the Snake game saves, retrieves, and clears **game history records** using the browser's `localStorage` API. You'll learn how data persists between game sessions, how the 10-record cap works, and how the history modal displays saved scores.

By the end of this tutorial, you'll understand:

- What `localStorage` is and how to use it
- How game records are saved when the snake dies
- How the 10-record limit is enforced
- How the history modal displays records
- How the clear-with-confirmation flow works

---

## Prerequisites

- **Web Storage concept** — cookies vs localStorage vs sessionStorage (explained below)
- **JSON** — `JSON.stringify` and `JSON.parse`
- **React state and effects** from [04-react-hooks-and-state.md](04-react-hooks-and-state.md)
- **i18n** from [08-i18n-with-context.md](08-i18n-with-context.md)

---

## What is localStorage?

**`localStorage`** is a web storage API that allows JavaScript to store key-value pairs persistently in the browser. Data stored in `localStorage`:

- **Survives page reloads** — close the app, reopen it, data is still there
- **Survives computer restarts** — persists on disk
- **Is domain-specific** — each website/app has its own isolated storage
- **Has a ~5-10MB limit** per domain
- **Is synchronous** — reading/writing is instant (no promises needed)

### localStorage vs Other Storage

| Feature | localStorage | sessionStorage | Cookies |
|---------|-------------|---------------|---------|
| Persists after close | ✅ Yes | ❌ No (cleared when tab closes) | ✅ Yes (with expiry) |
| Storage limit | ~5-10 MB | ~5 MB | ~4 KB |
| Sent to server | ❌ No | ❌ No | ✅ Yes (with every request) |
| API | Simple key-value | Simple key-value | Complex (parse cookies header) |

For a desktop game saving local scores, `localStorage` is the ideal choice — simple API, persistent, and no server needed.

### Basic API

```javascript
// Save
localStorage.setItem('key', 'value')

// Read
const value = localStorage.getItem('key')   // returns string or null

// Delete
localStorage.removeItem('key')

// Clear all
localStorage.clear()
```

`localStorage` can only store **strings**. To save objects, you must serialize to JSON:

```javascript
const record = { score: 10, date: '2026-06-20', duration: 45 }
localStorage.setItem('game-history', JSON.stringify(record))

const raw = localStorage.getItem('game-history')
const parsed = JSON.parse(raw)   // { score: 10, date: '2026-06-20', duration: 45 }
```

---

## The History Utility Module (`src/renderer/src/utils/history.ts`)

All `localStorage` operations are wrapped in a small utility module.

### Constants

```typescript
// src/renderer/src/utils/history.ts:1-2
const STORAGE_KEY = 'snake-game-history'
const MAX_RECORDS = 10
```

The storage key (`snake-game-history`) is the key used in `localStorage`. The `MAX_RECORDS` constant ensures only the most recent 10 records are kept.

### Getting Records

```typescript
// src/renderer/src/utils/history.ts:4-11
export function getRecords(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : []
  } catch {
    return []
  }
}
```

| Scenario | Returns |
|----------|---------|
| Key exists with valid JSON | Parsed array of records |
| Key doesn't exist | Empty array `[]` |
| JSON is corrupted/invalid | Empty array `[]` (caught by try/catch) |

The **try/catch** is important because:
- Another app or user might have corrupted the localStorage data
- An older version of the app might have stored data in a different format
- `JSON.parse` throws on invalid JSON

### Saving Records

```typescript
// src/renderer/src/utils/history.ts:13-19
export function saveRecord(record: HistoryRecord): void {
  const records = getRecords()
  records.unshift(record)
  const trimmed = records.slice(0, MAX_RECORDS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}
```

| Step | Operation | Result |
|------|-----------|--------|
| 1 | `getRecords()` | Get existing records (or empty array) |
| 2 | `records.unshift(record)` | Insert new record at the **beginning** (newest first) |
| 3 | `records.slice(0, 10)` | Keep only the first 10 (trim older ones) |
| 4 | `JSON.stringify(trimmed)` | Convert to JSON string |
| 5 | `localStorage.setItem(...)` | Save to localStorage |

#### Why `unshift` Instead of `push`?

`unshift` adds the new record to the **beginning** of the array. This means the most recent game is always at index 0, making display natural — newest first.

#### The 10-Record Cap

```
Before: [rec9, rec8, rec7, ..., rec1]  (10 records)
Save:   rec10 (newest)
        │
        ▼
After:  [rec10, rec9, rec8, ..., rec1]  (11 records)
        │
        ▼
Slice:  [rec10, rec9, rec8, ..., rec2]  (trimmed to 10, oldest removed)
```

### Clearing Records

```typescript
// src/renderer/src/utils/history.ts:21-24
export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

Simple and irreversible — removes the entire key from localStorage.

---

## When Records Are Saved

Records are saved in `App.tsx` when the snake dies:

```typescript
// src/renderer/src/App.tsx:24-31
const handleDeath = useCallback((finalScore: number) => {
  setScore(finalScore)
  const dur = Math.round((Date.now() - startTimeRef.current) / 1000)
  setDuration(dur)
  saveRecord({ score: finalScore, date: new Date().toLocaleString(), duration: dur })
  setScreen('gameover')
}, [])
```

The `saveRecord` call happens **before** the screen changes to `'gameover'`, so the record is already stored when the GameOver overlay appears.

### Record Structure

```typescript
interface HistoryRecord {
  score: number    // e.g., 12
  date: string     // e.g., "6/20/2026, 3:45:12 PM"
  duration: number // e.g., 45 (seconds)
}
```

- **`score`** — how many food pellets the player ate
- **`date`** — when the game ended, using the user's locale format
- **`duration`** — elapsed time in seconds (calculated as `Date.now() - startTimeRef.current`)

---

## The History Modal (`src/renderer/src/components/HistoryModal.tsx`)

The history modal displays saved records and allows clearing them.

### State

```typescript
// Inside HistoryModal
const [records, setRecords] = useState<HistoryRecord[]>(() => getRecords())
const [showConfirm, setShowConfirm] = useState(false)
```

- **`records`** is initialized from `localStorage` once when the component mounts
- **`showConfirm`** controls the clear confirmation dialog

### Modal Structure

```typescript
<div style="fixed, full-screen backdrop">
  <div style="centered modal box">
    <button>× close</button>
    <h2>History</h2>

    {records.length === 0 ? (
      <p>No records</p>
    ) : (
      <table>
        <thead><tr><th>Score</th><th>Duration</th><th>Date</th></tr></thead>
        <tbody>
          {records.map(r => (
            <tr><td>{r.score}</td><td>{r.duration}s</td><td>{r.date}</td></tr>
          ))}
        </tbody>
      </table>
    )}

    {!showConfirm ? (
      <button onClick={() => setShowConfirm(true)}>Clear</button>
    ) : (
      <div>
        <span>Delete all history?</span>
        <button onClick={handleClear}>Yes</button>
        <button onClick={() => setShowConfirm(false)}>No</button>
      </div>
    )}
  </div>
</div>
```

### Clear Flow

```
User clicks "Clear"
        │
        ▼
showConfirm = true
        │
        ▼
"确定要删除所有历史记录吗？" / "Delete all history records?"
  ┌────────┴────────┐
  │ Yes             │ No
  │                 │
  ▼                 ▼
clearRecords()     showConfirm = false
setRecords([])     (hide confirmation)
setShowConfirm(false)
```

### Why Confirm?

Game history is valuable to players (it shows their personal best). A one-click "Clear" could lead to accidental data loss. The confirmation step:

1. Prevents accidental clears
2. Makes the action deliberate
3. Uses the i18n system so the message shows in the player's language

---

## Data Persistence in Electron

Since this game runs in Electron (Chromium), `localStorage` stores data on the user's filesystem:

```
Windows:  %APPDATA%\electron-snake-game\Local Storage\
macOS:    ~/Library/Application Support/electron-snake-game/Local Storage/
Linux:    ~/.config/electron-snake-game/Local Storage/
```

The data is **sandboxed per app** — one Electron app cannot read another's localStorage. This means:

- Game history is private to this app
- History survives app updates (uninstalling/reinstalling may clear it, depending on the installer)
- No user authentication needed

---

## Key Takeaways

1. **`localStorage`** persists data as key-value pairs of strings, surviving restarts
2. **JSON serialization** (`JSON.stringify`/`parse`) converts objects to/from strings
3. **`saveRecord()`** adds to the beginning, caps at 10, stores in localStorage
4. **`getRecords()`** parses with try/catch for safety
5. **`clearRecords()`** removes the key entirely
6. **History Modal** reads from localStorage on mount, displays in a table, requires confirmation to clear
7. **Electron** stores localStorage in the app's data directory, sandboxed from other apps

---

## What's Next

Now you understand data persistence. The next tutorial **[10-testing-with-vitest.md](10-testing-with-vitest.md)** covers how the game logic and history utilities are tested using Vitest.
