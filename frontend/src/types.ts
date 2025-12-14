export type Point = [number, number];

export type SimulationStatus = "idle" | "running" | "success" | "failure";

export interface MazeEvent {
  type: "visit" | "solution" | "complete";
  path?: Point[];
  cell?: Point;
  length?: number;
  success?: boolean;
}

export interface SimulationState {
  activePath: Point[];
  solutionPath: Point[];
  visitedCells: Set<string>;
  status: SimulationStatus;
  message: string;
  error: string;
}
