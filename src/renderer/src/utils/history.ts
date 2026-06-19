import { HistoryRecord } from '../game/types'

const STORAGE_KEY = 'snake-game-history'
const MAX_RECORDS = 10

export function getRecords(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecord(record: HistoryRecord): void {
  const records = getRecords()
  records.unshift(record)
  const trimmed = records.slice(0, MAX_RECORDS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}
