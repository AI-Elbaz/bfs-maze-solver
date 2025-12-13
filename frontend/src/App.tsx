import React, {useState, useEffect, useRef} from "react";
import {
  Play,
  RotateCcw,
  ShieldBan,
  Footprints,
  Grid3X3,
  Info,
  Shuffle,
  Clock,
  Database,
  BrainCircuit,
  Eraser,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import "./index.css";

type Point = [number, number];

interface MazeStep {
  type: "init" | "processing" | "expand" | "leaf" | "done";
  route?: Point[];
  message: string;
  parentPath?: Point[];
  childNode?: Point;
  isSolution?: boolean;
  success?: boolean;
}

const ROWS = 15;
const COLS = 20;

const isSamePoint = (p1: Point, p2: Point) =>
  p1[0] === p2[0] && p1[1] === p2[1];

const MazeView: React.FC<{
  grid: number[][];
  start: Point;
  end: Point;
  activePath: Point[];
  solutionPath: Point[];
  visitedCells: Set<string>;
  onCellClick: (r: number, c: number) => void;
  isRunning: boolean;
}> = ({
  grid,
  start,
  end,
  activePath,
  solutionPath,
  visitedCells,
  onCellClick,
  isRunning,
}) => {
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
            const isStart = isSamePoint(p, start);
            const isEnd = isSamePoint(p, end);
            const isWall = cellVal === 1;

            // State checks
            const isSolution = solutionPath.some(sp => isSamePoint(sp, p));
            const isActive = activePath.some(ap => isSamePoint(ap, p));
            const isHead = head && isSamePoint(head, p);
            const isVisited = visitedCells.has(`${r},${c}`);

            // Styling Logic
            let bgClass = "bg-white"; // Default Empty
            let content = null;
            let animationClass = "";

            if (isWall) {
              bgClass = "bg-slate-800 shadow-inner";
            } else if (isStart) {
              bgClass = "bg-blue-600 shadow-md transform scale-105 z-10";
              content = <div className="text-xs font-bold text-white">S</div>;
            } else if (isEnd) {
              bgClass = "bg-red-500 shadow-md transform scale-105 z-10";
              content = <div className="text-xs font-bold text-white">E</div>;
            } else if (isSolution) {
              bgClass = "bg-emerald-400";
              animationClass = "animate-pulse";
            } else if (isHead) {
              bgClass = "bg-amber-500 ring-4 ring-amber-200 z-10";
            } else if (isActive) {
              bgClass = "bg-amber-300"; // Path currently being traced in memory
            } else if (isVisited) {
              bgClass = "bg-blue-100"; // Previously visited (Closed Set)
              animationClass = "duration-500 transition-colors";
            }

            return (
              <div
                key={`${r}-${c}`}
                onClick={() =>
                  !isRunning && !isStart && !isEnd && onCellClick(r, c)
                }
                className={`
                  relative rounded flex items-center justify-center cursor-pointer select-none
                  ${bgClass} ${animationClass}
                  ${!isRunning && !isStart && !isEnd ? "hover:bg-slate-200" : ""}
                `}>
                {content}
                {/* Small indicator dots for the solution path */}
                {isSolution && !isStart && !isEnd && (
                  <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
};

const startPos: Point = [1, 1];
const endPos: Point = [ROWS - 2, COLS - 2];

const MazeSimulator: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>([]);

  const [activePath, setActivePath] = useState<Point[]>([]);
  const [solutionPath, setSolutionPath] = useState<Point[]>([]);
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set());

  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "running" | "success" | "failure"
  >("idle");
  const [message, setMessage] = useState("Ready to start");
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    resetMaze(false);
  }, []);

  const resetMaze = (clearWalls: boolean) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsRunning(false);
    setStatus("idle");
    setActivePath([]);
    setSolutionPath([]);
    setVisitedCells(new Set());
    setMessage("Ready to start");
    setError("");

    if (clearWalls || grid.length === 0) {
      const newGrid = Array(ROWS)
        .fill(0)
        .map(() => Array(COLS).fill(0));
      setGrid(newGrid);
    }
  };

  const generateRandomMaze = () => {
    resetMaze(true);
    // 30% chance of wall
    const newGrid = Array(ROWS)
      .fill(0)
      .map(() =>
        Array(COLS)
          .fill(0)
          .map(() => (Math.random() < 0.3 ? 1 : 0)),
      );
    // Ensure Start/End are open
    newGrid[startPos[0]][startPos[1]] = 0;
    newGrid[endPos[0]][endPos[1]] = 0;
    setGrid(newGrid);
  };

  const toggleWall = (r: number, c: number) => {
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]]; // copy row
    newGrid[r][c] = newGrid[r][c] === 0 ? 1 : 0;
    setGrid(newGrid);
  };

  const runBFS = async () => {
    setIsRunning(true);
    setStatus("running");
    setSolutionPath([]);
    setActivePath([]);
    setVisitedCells(new Set());
    setError("");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("http://localhost:8000/api/maze", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          grid,
          start: {r: startPos[0], c: startPos[1]},
          end: {r: endPos[0], c: endPos[1]},
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Backend Error");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const {done, value} = await reader!.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data: MazeStep = JSON.parse(line);

          if (data.type === "processing" && data.route) {
            setActivePath(data.route);
            setMessage(data.message);
          } else if (data.type === "expand" && data.childNode) {
            setVisitedCells(prev => {
              const next = new Set(prev);
              next.add(`${data.childNode![0]},${data.childNode![1]}`);
              return next;
            });
          } else if (data.type === "leaf" && data.isSolution && data.route) {
            setSolutionPath(data.route);
            setActivePath([]); // Clear active exploration line to show solution clearly
            setMessage(data.message);
          } else if (data.type === "done") {
            setIsRunning(false);
            setStatus(data.success ? "success" : "failure");
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError")
        setError("Connection to Python backend failed.");
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* HEADER */}
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

        {/* LEFT COLUMN: MAZE (HERO) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Grid3X3 size={20} /> Maze Grid
              <span className="text-xs font-normal text-slate-400 hidden sm:inline-block ml-2">
                (Click cells to toggle walls)
              </span>
            </div>

            {/* Status Badge */}
            <div>
              {status === "idle" && (
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                  READY
                </span>
              )}
              {status === "running" && (
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  SEARCHING...
                </span>
              )}
              {status === "success" && (
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> SOLVED
                </span>
              )}
              {status === "failure" && (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <XCircle size={12} /> NO PATH
                </span>
              )}
            </div>
          </div>

          <MazeView
            grid={grid}
            start={startPos}
            end={endPos}
            activePath={activePath}
            solutionPath={solutionPath}
            visitedCells={visitedCells}
            onCellClick={toggleWall}
            isRunning={isRunning}
          />

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-2">
              <AlertCircle size={20} /> {error}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CONTROLS & INFO */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* CONTROLS */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Controls
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => resetMaze(true)}
                disabled={isRunning}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
                <Eraser size={16} /> Clear Walls
              </button>
              <button
                onClick={generateRandomMaze}
                disabled={isRunning}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
                <Shuffle size={16} /> Randomize
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={runBFS}
                disabled={isRunning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 shadow-sm transition-all active:scale-95">
                <Play size={18} /> Run BFS
              </button>
              <button
                onClick={() => resetMaze(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* STATUS LOG */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 min-h-[200px]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Live Log
            </h3>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 h-[120px] overflow-y-auto font-mono text-xs leading-5 text-slate-600">
              <span className="text-blue-600 font-bold">{">"}</span> {message}
            </div>

            <div className="mt-6 space-y-4">
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
                  <div className="w-4 h-4 bg-amber-500 rounded ring-2 ring-amber-300"></div>{" "}
                  Scanning
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-400 rounded"></div>{" "}
                  Shortest Path
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: ANALYSIS */}
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
                this is roughly proportional to the number of cells ($Rows
                \times Cols$).
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
