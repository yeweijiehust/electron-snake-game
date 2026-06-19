import { describe, it, expect, beforeEach } from 'vitest'
import { getRecords, saveRecord, clearRecords } from './history'

beforeEach(() => {
  localStorage.clear()
})

describe('history', () => {
  it('returns empty array when no records', () => {
    expect(getRecords()).toEqual([])
  })

  it('saves and retrieves records', () => {
    saveRecord({ score: 5, date: '2024-01-01', duration: 30 })
    const records = getRecords()
    expect(records).toHaveLength(1)
    expect(records[0].score).toBe(5)
  })

  it('keeps most recent first', () => {
    saveRecord({ score: 1, date: '2024-01-01', duration: 10 })
    saveRecord({ score: 2, date: '2024-01-02', duration: 20 })
    const records = getRecords()
    expect(records[0].score).toBe(2)
    expect(records[1].score).toBe(1)
  })

  it('caps at 10 records', () => {
    for (let i = 0; i < 15; i++) {
      saveRecord({ score: i, date: '2024-01-01', duration: i })
    }
    expect(getRecords()).toHaveLength(10)
    expect(getRecords()[0].score).toBe(14)
  })

  it('clears all records', () => {
    saveRecord({ score: 5, date: '2024-01-01', duration: 30 })
    clearRecords()
    expect(getRecords()).toEqual([])
  })
})
