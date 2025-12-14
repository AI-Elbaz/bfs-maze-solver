import {ROWS, COLS, WALL_PROBABILITY, START_POS, END_POS} from "./constants";
import type {Point, SimulationState} from "./types";

export const isSamePoint = (p1: Point, p2: Point): boolean =>
  p1[0] === p2[0] && p1[1] === p2[1];

export const pointToKey = (p: Point): string => `${p[0]},${p[1]}`;

export const createEmptyGrid = (): number[][] =>
  Array(ROWS)
    .fill(0)
    .map(() => Array(COLS).fill(0));

export const createRandomGrid = (): number[][] => {
  const grid = Array(ROWS)
    .fill(0)
    .map(() =>
      Array(COLS)
        .fill(0)
        .map(() => (Math.random() < WALL_PROBABILITY ? 1 : 0)),
    );

  // Ensure start and end are open
  grid[START_POS[0]][START_POS[1]] = 0;
  grid[END_POS[0]][END_POS[1]] = 0;

  return grid;
};

export const getInitialSimulationState = (): SimulationState => ({
  activePath: [],
  solutionPath: [],
  visitedCells: new Set(),
  status: "idle",
  message: "Ready to start",
  error: "",
});
