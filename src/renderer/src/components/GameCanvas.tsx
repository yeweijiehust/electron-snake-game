import { useRef, useEffect } from 'react'
import { Direction, CANVAS_SIZE } from '../game/types'
import { startLoop, initLoopState } from '../game/gameLoop'
import { drawGrid, drawSnake, drawFood } from '../game/renderer'

interface Props {
  screen: 'idle' | 'playing' | 'gameover'
  onDeath: (score: number) => void
  onScoreChange: (score: number) => void
}

export default function GameCanvas({ screen, onDeath, onScoreChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loopRef = useRef<ReturnType<typeof startLoop> | null>(null)
  const scoreRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const initial = initLoopState()
    drawGrid(ctx)
    drawSnake(ctx, initial.snake)
    drawFood(ctx, initial.food)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (screen !== 'playing') return

    scoreRef.current = 0
    const loop = startLoop(ctx, (state) => {
      if (state === null) {
        onDeath(scoreRef.current)
      } else {
        scoreRef.current = state.score
        onScoreChange(state.score)
      }
    })
    loopRef.current = loop

    const handleKeyDown = (e: KeyboardEvent) => {
      const dirMap: Record<string, Direction> = {
        ArrowUp: Direction.Up,
        ArrowDown: Direction.Down,
        ArrowLeft: Direction.Left,
        ArrowRight: Direction.Right
      }
      const dir = dirMap[e.key]
      if (dir) {
        e.preventDefault()
        loopRef.current?.handleDirection(dir)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      loop.stop()
      loopRef.current = null
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [screen])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{ display: 'block', margin: '0 auto', border: '2px solid #4ecca3' }}
    />
  )
}
