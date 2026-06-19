import { Snake, Position, CELL_SIZE, CANVAS_SIZE, GRID_SIZE } from './types'

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.strokeStyle = '#16213e'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= GRID_SIZE; x++) {
    ctx.beginPath()
    ctx.moveTo(x * CELL_SIZE, 0)
    ctx.lineTo(x * CELL_SIZE, CANVAS_SIZE)
    ctx.stroke()
  }
  for (let y = 0; y <= GRID_SIZE; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL_SIZE)
    ctx.lineTo(CANVAS_SIZE, y * CELL_SIZE)
    ctx.stroke()
  }
}

export function drawSnake(ctx: CanvasRenderingContext2D, snake: Snake): void {
  snake.body.forEach((seg, i) => {
    const isHead = i === snake.body.length - 1
    ctx.fillStyle = isHead ? '#4ecca3' : '#2d9b7a'
    ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
  })
}

export function drawFood(ctx: CanvasRenderingContext2D, food: Position): void {
  ctx.fillStyle = '#e94560'
  ctx.beginPath()
  const cx = food.x * CELL_SIZE + CELL_SIZE / 2
  const cy = food.y * CELL_SIZE + CELL_SIZE / 2
  ctx.arc(cx, cy, CELL_SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
}
