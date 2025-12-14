export type Point = [number, number];

export type SimulationStatus = "idle" | "running" | "success" | "failure";

export type MazeEvent =
  | {
      type: "visit";
      path: Point[];
    }
  | {
      type: "complete";
      success: boolean;
    };

export interface SimulationState {
  activePath: Point[];
  solutionPath: Point[];
  visitedCells: Set<string>;
  status: SimulationStatus;
  message: string;
  error: string;
}
