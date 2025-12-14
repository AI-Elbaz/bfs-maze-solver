import React, {useState, useEffect, useRef, useCallback} from "react";
import {
  Play,
  RotateCcw,
  ShieldBan,
  Footprints,
  Grid3X3,
  Shuffle,
  Clock,
  Database,
  BrainCircuit,
  Eraser,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Gauge,
  Info,
} from "lucide-react";

import "./index.css";
import type {
  Point,
  SimulationState,
  SimulationStatus,
  MazeEvent,
} from "./types";
import {COLS, ROWS, START_POS, END_POS} from "./constants";
import {
  isSamePoint,
  pointToKey,
  createEmptyGrid,
  getInitialSimulationState,
  createRandomGrid,
} from "./utils";

interface MazeCellProps {
  point: Point;
  isWall: boolean;
  isStart: boolean;
  isEnd: boolean;
  isSolution: boolean;
  isActive: boolean;
  isHead: boolean;
  isVisited: boolean;
  onClick: () => void;
  disabled: boolean;
}

const MazeCell = React.memo(
  ({
    isWall,
    isStart,
    isEnd,
    isSolution,
    isActive,
    isHead,
    isVisited,
    onClick,
    disabled,
  }: MazeCellProps) => {
    let bgClass = "bg-white";
    let content = null;
    let animationClass = "";

    if (isWall) {
      bgClass = "bg-slate-800 shadow-inner";
    } else if (isStart) {
      bgClass = "bg-blue-600 shadow-md transform z-10";
      content = <div className="text-xs font-bold text-white">S</div>;
    } else if (isEnd) {
      bgClass = "bg-red-500 shadow-md transform z-10";
      content = <div className="text-xs font-bold text-white">E</div>;
    } else if (isSolution) {
      bgClass = "bg-emerald-400";
      animationClass = "animate-pulse";
    } else if (isHead) {
      bgClass = "bg-blue-500 ring-4 ring-blue-200 z-10";
    } else if (isActive) {
      bgClass = "bg-blue-300";
    } else if (isVisited) {
      bgClass = "bg-blue-50";
      animationClass = "duration-300 transition-colors";
    }

    return (
      <div
        onClick={disabled ? undefined : onClick}
        className={`
        relative rounded flex items-center justify-center select-none aspect-square
        ${bgClass} ${animationClass}
        ${!disabled ? "cursor-pointer hover:bg-slate-200" : ""}
      `}>
        {content}
        {isSolution && !isStart && !isEnd && (
          <div className="w-2 h-2 bg-white rounded-full opacity-80" />
        )}
      </div>
    );
  },
);

interface MazeViewProps {
  grid: number[][];
  simulation: SimulationState;
  onCellClick: (r: number, c: number) => void;
  isRunning: boolean;
}

const MazeView = ({
  grid,
  simulation,
  onCellClick,
  isRunning,
}: MazeViewProps) => {
  const {activePath, solutionPath, visitedCells} = simulation;
  const head = activePath.length > 0 ? activePath[activePath.length - 1] : null;

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div
        className="grid gap-1 mx-auto bg-slate-100 p-2 rounded-lg border border-slate-200"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          width: "100%",
          aspectRatio: `${COLS}/${ROWS}`,
        }}>
        {grid.map((row, r) =>
          row.map((cellVal, c) => {
            const p: Point = [r, c];
            const isStart = isSamePoint(p, START_POS);
            const isEnd = isSamePoint(p, END_POS);

            return (
              <MazeCell
                key={pointToKey(p)}
                point={p}
                isWall={cellVal === 1}
                isStart={isStart}
                isEnd={isEnd}
                isSolution={solutionPath.some(sp => isSamePoint(sp, p))}
                isActive={activePath.some(ap => isSamePoint(ap, p))}
                isHead={head ? isSamePoint(head, p) : false}
                isVisited={visitedCells.has(pointToKey(p))}
                onClick={() => onCellClick(r, c)}
                disabled={isRunning || isStart || isEnd}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({status}: {status: SimulationStatus}) => {
  const badges = {
    idle: (
      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
        READY
      </span>
    ),
    running: (
      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
        SEARCHING...
      </span>
    ),
    success: (
      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
        <CheckCircle2 size={12} /> SOLVED
      </span>
    ),
    failure: (
      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
        <XCircle size={12} /> NO PATH
      </span>
    ),
  };

  return badges[status];
};

interface ControlPanelProps {
  isRunning: boolean;
  animationSpeed: number;
  onSpeedChange: (speed: number) => void;
  onClearWalls: () => void;
  onRandomize: () => void;
  onRunBFS: () => void;
  onReset: () => void;
}

const ControlPanel = ({
  isRunning,
  animationSpeed,
  onSpeedChange,
  onClearWalls,
  onRandomize,
  onRunBFS,
  onReset,
}: ControlPanelProps) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
      Controls
    </h3>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <button
        onClick={onClearWalls}
        disabled={isRunning}
        className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50">
        <Eraser size={16} /> Clear Walls
      </button>
      <button
        onClick={onRandomize}
        disabled={isRunning}
        className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50">
        <Shuffle size={16} /> Randomize
      </button>
    </div>

    <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
          <Gauge size={14} /> Animation Speed
        </label>
        <span className="text-xs text-slate-500 font-mono">
          {animationSpeed}ms
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="200"
        step="10"
        value={animationSpeed}
        onChange={e => onSpeedChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>Fast</span>
        <span>Slow</span>
      </div>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onRunBFS}
        disabled={isRunning}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 shadow-sm transition-all active:scale-95">
        <Play size={18} /> Run BFS
      </button>
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
        <RotateCcw size={18} />
      </button>
    </div>
  </div>
);

const MazeSimulator = () => {
  const [grid, setGrid] = useState<number[][]>(createEmptyGrid());
  const [simulation, setSimulation] = useState<SimulationState>(
    getInitialSimulationState(),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(50);

  const speedRef = useRef(animationSpeed);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    speedRef.current = animationSpeed;
  }, [animationSpeed]);

  const resetSimulation = useCallback((clearWalls: boolean) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsRunning(false);
    setSimulation(getInitialSimulationState());

    if (clearWalls) {
      setGrid(createEmptyGrid());
    }
  }, []);

  const handleRandomize = useCallback(() => {
    resetSimulation(false);
    setGrid(createRandomGrid());
  }, [resetSimulation]);

  const toggleWall = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const newGrid = prev.map((row, rowIdx) =>
        rowIdx === r ? [...row] : row,
      );
      newGrid[r][c] = newGrid[r][c] === 0 ? 1 : 0;
      return newGrid;
    });
  }, []);

  const processStreamData = useCallback(
    (event: MazeEvent, controller: AbortController) => {
      if (controller.signal.aborted) return;

      switch (event.type) {
        case "visit":
          // Show current exploration path
          if (event.path) {
            const cell = event.path[event.path.length - 1];
            setSimulation(prev => ({
              ...prev,
              activePath: event.path,
              visitedCells: new Set(prev.visitedCells).add(pointToKey(cell)),
              message: `Exploring cell (${cell[0]}, ${cell[1]})`,
            }));
          }
          break;

        case "complete":
          // Simulation ended
          if (!controller.signal.aborted) {
            setIsRunning(false);
            setSimulation(prev => ({
              ...prev,
              status: event.success ? "success" : "failure",
              solutionPath: event.success ? prev.activePath : [],
              message: event.success
                ? `Maze solved! Path length: ${prev.activePath.length}`
                : "No path exists to target",
            }));
          }
          break;
      }
    },
    [],
  );

  const runBFS = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setSimulation({
      ...getInitialSimulationState(),
      status: "running",
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/maze`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          grid,
          start: {r: START_POS[0], c: START_POS[1]},
          end: {r: END_POS[0], c: END_POS[1]},
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Backend Error");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const {done, value} = await reader!.read();
        if (controller.signal.aborted || done) break;

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || controller.signal.aborted) continue;

          const event: MazeEvent = JSON.parse(line);
          processStreamData(event, controller);

          // Add delay between events (except for 'complete')
          if (event.type !== "complete" && speedRef.current > 0) {
            await new Promise(resolve => setTimeout(resolve, speedRef.current));
            if (controller.signal.aborted) break;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setSimulation(prev => ({
          ...prev,
          error: "Connection to Python backend failed.",
        }));
        setIsRunning(false);
      }
    }
  }, [isRunning, grid, processStreamData]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Footprints className="text-blue-600" size={32} />
            Breadth-First Search (BFS) Visualizer
          </h1>
          <p className="text-slate-600 mt-1">
            Watch BFS explore a grid layer-by-layer to guarantee the shortest
            path.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Grid3X3 size={20} /> Maze Grid
              <span className="text-xs font-normal text-slate-400 hidden sm:inline-block ml-2">
                (Click cells to toggle walls)
              </span>
            </div>
            <StatusBadge status={simulation.status} />
          </div>

          <MazeView
            grid={grid}
            simulation={simulation}
            onCellClick={toggleWall}
            isRunning={isRunning}
          />

          {simulation.error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-2">
              <AlertCircle size={20} /> {simulation.error}
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <ControlPanel
            isRunning={isRunning}
            animationSpeed={animationSpeed}
            onSpeedChange={setAnimationSpeed}
            onClearWalls={() => resetSimulation(true)}
            onRandomize={handleRandomize}
            onRunBFS={runBFS}
            onReset={() => resetSimulation(false)}
          />
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} /> Legend
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div> Start
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div> End
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-800 rounded"></div> Wall
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded"></div> Visited
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded ring-2 ring-blue-300"></div>{" "}
                Scanning
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-400 rounded"></div> Shortest
                Path
              </div>
            </div>
          </div>
          {/* message */}
          {simulation.message && (
            <div className="col-span-12 bg-blue-50 text-blue-700 p-4 rounded-lg border border-blue-200">
              {simulation.message}
            </div>
          )}
        </div>

        <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BrainCircuit className="text-slate-600" /> Why BFS for Mazes?
            </h2>
            <p className="text-slate-600 mt-1">
              BFS is efficient here because we stop as soon as we find the
              target.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                <Clock size={18} className="text-red-500" /> Time Complexity
              </div>
              <div className="text-2xl font-mono font-bold mb-2 text-slate-900">
                O(V + E)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                It visits every vertex (cell) and edge at most once. In a grid,
                this is roughly proportional to the number of cells (Rows ×
                Cols).
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                <Database size={18} className="text-blue-500" /> Space
                Complexity
              </div>
              <div className="text-2xl font-mono font-bold mb-2 text-slate-900">
                O(V)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The queue stores the "frontier" of the search. In the worst case
                (a wide open grid), this might hold the diagonal of the grid.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                <ShieldBan size={18} className="text-emerald-500" /> Shortest
                Path Guarantee
              </div>
              <div className="text-lg font-bold text-emerald-700 mb-1">Yes</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Because BFS explores level-by-level (all 1-step paths, then
                2-step paths...), the first time it hits the goal, it is
                guaranteed to be the shortest route in an unweighted grid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MazeSimulator;
