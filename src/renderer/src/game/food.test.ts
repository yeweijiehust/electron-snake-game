import { describe, it, expect } from 'vitest'
import { generateFood } from './food'
import { GRID_SIZE } from './types'

describe('generateFood', () => {
  it('generates food within grid bounds', () => {
    const snakeBody = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]
    for (let i = 0; i < 50; i++) {
      const food = generateFood(snakeBody)
      expect(food.x).toBeGreaterThanOrEqual(0)
      expect(food.x).toBeLessThan(GRID_SIZE)
      expect(food.y).toBeGreaterThanOrEqual(0)
      expect(food.y).toBeLessThan(GRID_SIZE)
    }
  })

  it('does not generate food on snake body', () => {
    const snakeBody = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]
    for (let i = 0; i < 100; i++) {
      const food = generateFood(snakeBody)
      const onSnake = snakeBody.some((s) => s.x === food.x && s.y === food.y)
      expect(onSnake).toBe(false)
    }
  })

  it('returns a valid position when grid is almost full', () => {
    const snakeBody: { x: number; y: number }[] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (x !== 0 || y !== 0) {
          snakeBody.push({ x, y })
        }
      }
    }
    const food = generateFood(snakeBody)
    expect(food).toEqual({ x: 0, y: 0 })
  })
})
