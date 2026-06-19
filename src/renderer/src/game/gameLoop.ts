import { Snake, Position, Direction, TICK_INTERVAL } from './types'
import { moveSnake, changeDirection, createSnake } from './snake'
import { generateFood } from './food'
import { drawGrid, drawSnake, drawFood } from './renderer'

export interface LoopState {
  snake: Snake
  food: Position
  score: number
}

export function initLoopState(): LoopState {
  const snake = createSnake()
  return {
    snake,
    food: generateFood(snake.body),
    score: 0
  }
}

export function tick(state: LoopState, ctx: CanvasRenderingContext2D): LoopState | null {
  const { snake, food, score } = state

  const { ate } = moveSnake(snake, food)

  if (!snake.alive) {
    drawGrid(ctx)
    drawSnake(ctx, snake)
    return null
  }

  let newFood = food
  let newScore = score

  if (ate) {
    newScore = score + 1
    newFood = generateFood(snake.body)
  }

  drawGrid(ctx)
  drawSnake(ctx, snake)
  drawFood(ctx, newFood)

  return { snake, food: newFood, score: newScore }
}

export function startLoop(
  ctx: CanvasRenderingContext2D,
  onStateChange: (state: LoopState | null) => void
): { stop: () => void; handleDirection: (dir: Direction) => void } {
  let state = initLoopState()
  let alive = true

  drawGrid(ctx)
  drawSnake(ctx, state.snake)
  drawFood(ctx, state.food)
  onStateChange(state)

  const intervalId = setInterval(() => {
    if (!alive) return
    const next = tick(state, ctx)
    if (next === null) {
      alive = false
      clearInterval(intervalId)
      onStateChange(null)
      return
    }
    state = next
    onStateChange(next)
  }, TICK_INTERVAL)

  return {
    stop: () => {
      alive = false
      clearInterval(intervalId)
    },
    handleDirection: (dir: Direction) => {
      if (!alive) return
      changeDirection(state.snake, dir)
    }
  }
}
