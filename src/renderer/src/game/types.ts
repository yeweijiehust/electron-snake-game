export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT'
}

export interface Position {
  x: number
  y: number
}

export interface Snake {
  body: Position[]
  direction: Direction
  queue: Direction[]
  alive: boolean
}

export interface GameState {
  snake: Snake
  food: Position
  score: number
  startTime: number
}

export interface HistoryRecord {
  score: number
  date: string
  duration: number
}

export const GRID_SIZE = 20
export const CELL_SIZE = 25
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE
export const TICK_INTERVAL = 150
