import { describe, it, expect } from 'vitest'
import { createSnake, changeDirection, moveSnake, checkCollision } from './snake'
import { Direction } from './types'

describe('createSnake', () => {
  it('creates a snake of length 3 at center', () => {
    const snake = createSnake()
    expect(snake.body).toHaveLength(3)
    expect(snake.alive).toBe(true)
    expect(snake.direction).toBe(Direction.Right)
    expect(snake.queue).toEqual([])
  })
})

describe('changeDirection', () => {
  it('ignores opposite direction', () => {
    const snake = createSnake()
    changeDirection(snake, Direction.Left)
    expect(snake.direction).toBe(Direction.Right)
    expect(snake.queue).toEqual([])
  })

  it('queues a valid direction change', () => {
    const snake = createSnake()
    changeDirection(snake, Direction.Up)
    expect(snake.queue).toEqual([Direction.Up])
  })

  it('queues up to 2 inputs', () => {
    const snake = createSnake()
    changeDirection(snake, Direction.Up)
    changeDirection(snake, Direction.Left)
    changeDirection(snake, Direction.Down)
    expect(snake.queue).toHaveLength(2)
    expect(snake.queue).toEqual([Direction.Up, Direction.Left])
  })
})

describe('moveSnake', () => {
  it('moves the snake forward', () => {
    const snake = createSnake()
    const food = { x: 99, y: 99 }
    const before = snake.body.length
    moveSnake(snake, food)
    expect(snake.body).toHaveLength(before)
    expect(snake.alive).toBe(true)
  })

  it('grows when eating food', () => {
    const snake = createSnake()
    const head = snake.body[snake.body.length - 1]
    const food = { x: head.x + 1, y: head.y }
    const before = snake.body.length
    moveSnake(snake, food)
    expect(snake.body).toHaveLength(before + 1)
  })

  it('dies on wall collision', () => {
    const snake = createSnake()
    snake.body = [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }]
    snake.direction = Direction.Left
    moveSnake(snake, { x: 99, y: 99 })
    expect(snake.alive).toBe(false)
  })

  it('dies on self collision', () => {
    const snake = createSnake()
    snake.body = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 6, y: 7 }
    ]
    snake.direction = Direction.Right
    moveSnake(snake, { x: 99, y: 99 })
    expect(snake.alive).toBe(false)
  })
})

describe('checkCollision', () => {
  it('returns true when head touches body', () => {
    const body = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]
    expect(checkCollision({ x: 5, y: 5 }, body)).toBe(true)
  })

  it('returns false when head is clear', () => {
    const body = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]
    expect(checkCollision({ x: 8, y: 5 }, body)).toBe(false)
  })
})
