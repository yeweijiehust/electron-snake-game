import { Position, GRID_SIZE } from './types'

export function generateFood(snakeBody: Position[]): Position {
  const occupied = new Set(snakeBody.map((p) => `${p.x},${p.y}`))
  const available: Position[] = []
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y })
      }
    }
  }
  if (available.length === 0) {
    return { x: 0, y: 0 }
  }
  return available[Math.floor(Math.random() * available.length)]
}
