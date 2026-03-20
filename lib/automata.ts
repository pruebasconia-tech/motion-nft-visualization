import { FrameState } from './processor'

export interface CellularState {
  cells: number[]
}

const NEIGHBORS: Record<number, number[]> = {
  0: [1, 4, 5], 11: [12, 13, 23], 12: [11, 14, 24],
  1: [0, 2], 2: [1, 3], 13: [11, 15], 14: [12, 16],
  15: [13, 17], 16: [14, 18], 23: [11, 25], 24: [12, 26],
  25: [23, 27], 26: [24, 28], 3: [2], 4: [0], 5: [0],
  6: [5], 7: [3], 8: [6], 9: [5], 10: [9], 17: [15],
  18: [16], 19: [15], 20: [16], 21: [15], 22: [16],
  27: [25], 28: [26], 29: [27], 30: [28], 31: [27], 32: [28]
}

export function initializeAutomata(frame: FrameState): CellularState {
  return { cells: [...frame.joints] }
}

export function stepAutomata(current: CellularState, frame: FrameState): CellularState {
  const newCells = new Array(33).fill(0)

  for (let i = 0; i < 33; i++) {
    const energy = current.cells[i]
    const motionEnergy = frame.joints[i]
    const neighbors = NEIGHBORS[i] || []
    let liveNeighbors = neighbors.filter(n => current.cells[n] > 0.2).length

    let cellValue = motionEnergy * 0.6
    if (energy > 0.2 && (liveNeighbors === 2 || liveNeighbors === 3)) {
      cellValue += 0.3
    }

    newCells[i] = Math.min(1, cellValue) * 0.95
  }

  return { cells: newCells }
}

export function getCellRGB(val: number): [number, number, number] {
  return [
    Math.round(val * 255),
    Math.round((1 - val) * 100),
    Math.round((1 - val) * 200)
  ]
}
