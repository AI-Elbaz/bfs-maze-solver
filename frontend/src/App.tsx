import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RotateCcw, Plus, Minus, AlertCircle, Network, GitGraph, Info, Shuffle } from 'lucide-react';
import './index.css';

// --- TYPES ---

interface City {
  id: number;
  x: number;
  y: number;
}

interface TreeNode {
  id: string; 
  cityIndex: number;
  depth: number;
  children: TreeNode[];
  distanceFromParent?: number;
  x?: number;
  y?: number;
  width?: number;
}

interface RenderNode extends TreeNode {
  x: number;
  y: number;
}

interface RenderLink {
  source: { x: number; y: number; id: string };
  target: { x: number; y: number; id: string };
  distance?: number;
  key: string;
}

type BfsMessageType = 'init' | 'processing' | 'expand' | 'leaf' | 'done';

interface BfsStep {
  type: BfsMessageType;
  route?: number[];
  message: string;
  parentPath?: number[];
  childCity?: number;
  bestDistance?: number | null;
  bestRoute?: number[];
  isBest?: boolean;
}

// --- HELPERS ---

const getDistance = (c1: City, c2: City) => {
  const dx = c1.x - c2.x;
  const dy = c1.y - c2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getShortenedEnd = (x1: number, y1: number, x2: number, y2: number, shortenBy: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0 || length < shortenBy) return { x: x2, y: y2 };

  const ratio = (length - shortenBy) / length;
  return {
    x: x1 + dx * ratio,
    y: y1 + dy * ratio
  };
};

// --- COMPONENTS ---

const MapView: React.FC<{
  cities: City[];
  activePath: number[];
  bestRoute: number[];
}> = ({ cities, activePath, bestRoute }) => {
  
  const isFinished = activePath.length === 0 && bestRoute.length > 0;
  
  const NODE_RADIUS = 16;
  const HEAD_RADIUS = 20;

  return (
    <div className="relative w-full h-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-inner">
      <svg width="100%" height="100%" className="absolute inset-0 opacity-10 pointer-events-none">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <marker id="arrow-active" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="#f59e0b" />
          </marker>
          <marker id="arrow-best" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="#10b981" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <svg viewBox="0 0 400 300" className="w-full h-full relative z-10">
        
        {/* Ghost Route */}
        {!isFinished && bestRoute.length > 0 && bestRoute.map((cityId, i) => {
           // Skip drawing the return line for the ghost route to keep it cleaner, or include it?
           // Usually better to show full cycle.
           if (i === bestRoute.length - 1) return null; // Only if bestRoute includes 0 at end.
           
           // Check if bestRoute actually has the return 0. If not, use modulo.
           // Our logic now adds 0 to bestRoute, so standard iteration handles it.
           // If the array is [0, 1, 2, 0], we iterate i=0..3.
           // line 0->1, 1->2, 2->0.
           if (i === bestRoute.length - 1) return null; // last element is destination of previous

           const start = cities[bestRoute[i]];
           const end = cities[bestRoute[i+1]];
           return (
             <line
              key={`best-ghost-${i}`}
              x1={start.x} y1={start.y}
              x2={end.x} y2={end.y}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.3"
             />
          );
        })}

        {/* Best Route Solid */}
        {isFinished && bestRoute.length > 0 && bestRoute.map((cityId, i) => {
           if (i === bestRoute.length - 1) return null;
           const start = cities[cityId];
           const end = cities[bestRoute[i+1]];
           
           const { x: endX, y: endY } = getShortenedEnd(start.x, start.y, end.x, end.y, NODE_RADIUS + 4);

           return (
             <line
                key={`best-solid-${i}`}
                x1={start.x} y1={start.y}
                x2={endX} y2={endY}
                stroke="#10b981"
                strokeWidth="2.5"
                markerEnd="url(#arrow-best)"
                opacity="1"
             />
           );
        })}

        {/* Active Path */}
        {activePath.length > 1 && activePath.map((cityId, i) => {
           if (i === activePath.length - 1) return null;
           const start = cities[cityId];
           const end = cities[activePath[i + 1]];
           const isTargetHead = i + 1 === activePath.length - 1;
           const offset = isTargetHead ? HEAD_RADIUS + 4 : NODE_RADIUS + 4;
           const { x: endX, y: endY } = getShortenedEnd(start.x, start.y, end.x, end.y, offset);

           return (
             <line
                key={`active-${i}`}
                x1={start.x} y1={start.y}
                x2={endX} y2={endY}
                stroke="#f59e0b"
                strokeWidth="2.5"
                markerEnd="url(#arrow-active)"
                opacity="0.9"
             />
           );
        })}

        {/* Cities */}
        {cities.map((city) => {
          const activeIndex = activePath.indexOf(city.id);
          // Note: bestRoute might contain [0, 1, 2, 0]. IndexOf returns first 0.
          const isBest = bestRoute.includes(city.id);
          
          const isActive = activeIndex !== -1;
          const isCurrentHead = activePath.length > 0 && activePath[activePath.length - 1] === city.id;
          const isStart = city.id === 0;
          
          let fill = '#e2e8f0'; 
          let stroke = '#94a3b8';
          let strokeWidth = 2;
          let radius = NODE_RADIUS;
          let badgeColor = '';
          let badgeIndex = -1;

          if (isFinished && isBest) {
            fill = '#dcfce7'; 
            stroke = '#10b981';
            strokeWidth = 2.5;
            badgeColor = '#10b981';
            // Find index in bestRoute (ignoring the final return 0 for labeling)
            badgeIndex = bestRoute.indexOf(city.id) + 1;
          }
          else if (!isFinished && isActive) {
            fill = '#dbeafe'; 
            stroke = '#3b82f6';
            badgeColor = '#3b82f6';
            badgeIndex = activeIndex + 1;

            if (isCurrentHead) {
               fill = '#f59e0b';
               stroke = '#b45309';
               radius = HEAD_RADIUS;
            }
          }
          else if (isStart) {
             fill = '#f8fafc';
             stroke = '#ef4444'; 
             strokeWidth = 2.5;
          }

          return (
            <g key={city.id}>
              {isStart && (
                <text 
                    x={city.x} 
                    y={city.y - 24} 
                    textAnchor="middle" 
                    fontSize="10" 
                    fontWeight="800" 
                    fill="#ef4444"
                    style={{ textShadow: "0px 1px 2px rgba(255,255,255,1)" }}
                >
                    START
                </text>
              )}

              <circle
                cx={city.x}
                cy={city.y}
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                className="transition-colors duration-300"
              />
              {badgeIndex > 0 && (
                <g>
                  <circle cx={city.x + 12} cy={city.y - 12} r="8" fill={badgeColor} className="shadow-sm" />
                  <text x={city.x + 12} y={city.y - 12} dy="3.5" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                    {badgeIndex}
                  </text>
                </g>
              )}
              <text x={city.x} y={city.y} dy=".35em" textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">
                {city.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TreeDiagram: React.FC<{
  treeData: TreeNode | null;
  activePath: number[];
  bestRoute: number[];
  width: number;
  height: number;
}> = ({ treeData, activePath, bestRoute, width, height }) => {
  
  const { nodes, links, totalWidth } = useMemo(() => {
    if (!treeData) return { nodes: [], links: [], totalWidth: 0 };

    const nodeList: RenderNode[] = [];
    const linkList: RenderLink[] = [];
    const LEAF_WIDTH = 70; 
    const PX_PER_UNIT = 0.8; 
    const MIN_LENGTH = 50;   
    const ROOT_Y = 40;       

    const calculateSubtreeWidth = (node: TreeNode): number => {
      if (!node.children || node.children.length === 0) {
        node.width = LEAF_WIDTH;
      } else {
        let sumWidth = 0;
        node.children.forEach((child) => {
          sumWidth += calculateSubtreeWidth(child);
        });
        node.width = Math.max(LEAF_WIDTH, sumWidth);
      }
      return node.width!;
    };

    calculateSubtreeWidth(treeData);

    const assignCoordinates = (node: TreeNode, currentY: number, startX: number) => {
      const nodeX = startX + (node.width! / 2);

      nodeList.push({ ...node, x: nodeX, y: currentY });

      let currentChildX = startX;
      if (node.children) {
        node.children.forEach((child) => {
          const childDistance = child.distanceFromParent || 0;
          const branchLength = Math.max(childDistance * PX_PER_UNIT, MIN_LENGTH);
          const childY = currentY + branchLength;
          const childXCenter = currentChildX + (child.width! / 2);

          linkList.push({
            source: { x: nodeX, y: currentY, id: node.id },
            target: { x: childXCenter, y: childY, id: child.id },
            distance: childDistance,
            key: `${node.id}->${child.id}`,
          });

          assignCoordinates(child, childY, currentChildX);
          currentChildX += child.width!;
        });
      }
    };

    assignCoordinates(treeData, ROOT_Y, 0);

    return { nodes: nodeList, links: linkList, totalWidth: treeData.width || 0 };
  }, [treeData]);

  const svgWidth = Math.max(width, totalWidth);
  const svgHeight = Math.max(height, nodes.length > 0 ? Math.max(...nodes.map((n) => n.y)) + 60 : 0);
  const offsetX = Math.max(0, (width - totalWidth) / 2);

  return (
    <div className="w-full h-full overflow-auto bg-slate-50 relative rounded-lg border border-slate-200 shadow-inner">
      <svg width={svgWidth} height={svgHeight} className="block">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <g transform={`translate(${offsetX}, 0)`}>
          {links.map((link) => {
             const activeId = activePath.join('-');
             const bestId = bestRoute.join('-');
             
             // Check connectivity. activePath and bestRoute now include the final 0.
             const isLinkActive = activeId.startsWith(link.target.id);
             const isLinkBest = bestRoute.length > 0 && bestId.startsWith(link.target.id);

             let stroke = "#cbd5e1";
             let strokeWidth = 1.5;
             const opacity = 1;
             let textColor = "#94a3b8";

             if (isLinkBest) {
               stroke = "#10b981"; 
               strokeWidth = 3;
               textColor = "#059669";
             } else if (isLinkActive) {
               stroke = "#f59e0b"; 
               strokeWidth = 3;
               textColor = "#d97706";
             }

             const midX = (link.source.x + link.target.x) / 2;
             const midY = (link.source.y + link.target.y) / 2;
             const curveY = Math.min(40, (link.target.y - link.source.y) / 2);

             return (
               <g key={link.key}>
                 <path
                    d={`M${link.source.x},${link.source.y} C${link.source.x},${link.source.y + curveY} ${link.target.x},${link.target.y - curveY} ${link.target.x},${link.target.y}`}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    fill="none"
                    opacity={opacity}
                    className="transition-colors duration-300"
                  />
                  
                  {link.distance !== undefined && (
                    <g>
                        <rect 
                            x={midX - 12} 
                            y={midY - 7} 
                            width="24" 
                            height="14" 
                            fill="rgba(255,255,255,0.85)" 
                            rx="4"
                        />
                        <text
                            x={midX}
                            y={midY}
                            dy=".3em"
                            textAnchor="middle"
                            fontSize="9"
                            fontFamily="monospace"
                            fill={textColor}
                            fontWeight="bold"
                        >
                            {link.distance.toFixed(0)}
                        </text>
                    </g>
                  )}
               </g>
             );
          })}

          {nodes.map((node) => {
            const nodeId = node.id;
            const activeId = activePath.join('-');
            const bestId = bestRoute.join('-');

            const isActive = activeId === nodeId; 
            const isActivePath = activeId.startsWith(nodeId); 
            const isBestPath = bestRoute.length > 0 && bestId.startsWith(nodeId); 

            let fill = '#f8fafc'; 
            let stroke = '#94a3b8';
            let strokeWidth = 1.5;
            let r = 13; 
            let filter = '';
            let fontSize = "11px";
            let fontColor = '#334155';

            if (isActive) {
              fill = '#f59e0b';
              stroke = '#b45309';
              strokeWidth = 3;
              r = 16;
              filter = 'url(#glow)';
              fontSize = "12px";
              fontColor = 'white';
            } else if (isBestPath) {
              fill = '#10b981'; 
              stroke = '#065f46';
              strokeWidth = 2.5;
              fontColor = 'white';
              if (bestRoute.length === node.depth + 1) {
                 r = 14;
              }
            } else if (isActivePath) {
              fill = '#fcd34d'; 
              stroke = '#d97706';
              strokeWidth = 2.5;
            } else if (activeId.startsWith(nodeId + '-')) {
               fill = '#bfdbfe';
               stroke = '#3b82f6';
            }

            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                <circle
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  filter={filter}
                  className="transition-all duration-300"
                />
                <text
                  dy=".35em"
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight="bold"
                  fill={fontColor}
                  pointerEvents="none"
                >
                  {node.cityIndex}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

const TSPSimulator: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const [activePath, setActivePath] = useState<number[]>([]);
  const [bestRoute, setBestRoute] = useState<number[]>([]);
  const [bestDistance, setBestDistance] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("Ready to start");
  
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [error, setError] = useState<string>('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const backendUrl = 'http://localhost:8000';

  const generateCities = (count: number) => {
    const newCities: City[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 300 + 40,
      y: Math.random() * 200 + 40,
    }));
    setCities(newCities);
    reset();
  };

  const reset = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsRunning(false);
    setActivePath([]);
    setBestRoute([]);
    setBestDistance(null);
    setTreeRoot(null);
    setMessage("Ready to start");
    setError("");
  };

  const addToTree = (root: TreeNode | null, parentPath: number[], newRoute: number[], childCity: number): TreeNode => {
    if (!root) return { id: "0", cityIndex: 0, depth: 0, children: [] };
    
    const newRoot = structuredClone(root);
    let current = newRoot;
    
    // parentPath here is the path BEFORE adding childCity.
    // E.g., if we are adding 0 to [0,1,2], parentPath is [0,1,2].
    for (let i = 1; i < parentPath.length; i++) {
      const stepCity = parentPath[i];
      const nextNode = current.children.find(c => c.cityIndex === stepCity);
      if (nextNode) {
        current = nextNode;
      } else {
        return root;
      }
    }

    if (!current.children.find(c => c.cityIndex === childCity)) {
        // Calculate Distance from parent (last city in parentPath) to new child
        const parentCityId = parentPath[parentPath.length - 1]; 
        const parentCityObj = cities.find(c => c.id === parentCityId);
        const childCityObj = cities.find(c => c.id === childCity);
        
        let dist = 0;
        if (parentCityObj && childCityObj) {
            dist = getDistance(parentCityObj, childCityObj);
        }

        current.children.push({
            id: newRoute.join('-'),
            cityIndex: childCity,
            depth: newRoute.length - 1,
            distanceFromParent: dist,
            children: []
        });
    }

    return newRoot;
  };

  const runBFS = async () => {
    if (cities.length > 6) {
      setError("Maximum 6 cities allowed for Tree View visualization.");
      return;
    }
    
    reset();
    setIsRunning(true);
    setError("");
    setTreeRoot({ id: "0", cityIndex: 0, depth: 0, children: [] });
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${backendUrl}/api/bfs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cities }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Failed to connect to backend");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data: BfsStep = JSON.parse(line);
            
            if (data.type === 'expand' && data.parentPath && data.route && data.childCity !== undefined) {
              setTreeRoot(prev => addToTree(prev, data.parentPath!, data.route!, data.childCity!));
              if (data.bestDistance !== undefined) setBestDistance(data.bestDistance);
            } 
            else if (data.type === 'processing' && data.route) {
              setActivePath(data.route);
              setMessage(data.message);
              if (data.bestDistance !== undefined) setBestDistance(data.bestDistance);
            } 
            else if (data.type === 'leaf' && data.route) {
              // --- CHANGED LOGIC HERE ---
              // Explicitly add the return-to-start node (0) to tree and visualization
              const fullRoute = [...data.route, 0];
              
              // 1. Add to Tree
              setTreeRoot(prev => addToTree(prev, data.route!, fullRoute, 0));
              
              // 2. Set Active Path for visuals
              setActivePath(fullRoute);
              
              // 3. Update Best Route if applicable
              if (data.isBest) {
                // Backend sends bestRoute without the 0, but provides data.bestRoute.
                // We should use the constructed fullRoute for consistency in frontend state.
                setBestRoute(fullRoute);
                setBestDistance(data.bestDistance!);
              }
            } 
            else if (data.type === 'done') {
              setIsRunning(false);
              setMessage(data.message);
              setActivePath([]); 
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError("Error connecting to Python backend. Is it running on port 8000?");
      }
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    generateCities(4);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        
        {/* HEADER */}
        <div className="col-span-12">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Network className="text-blue-600" size={32} />
            Traveling Salesman Problem
          </h1>
          <p className="text-slate-600 mt-1">
            Visualizing the State Space Tree using Breadth-First Search (Brute Force).
          </p>
        </div>

        {/* CONTROLS BAR */}
        <div className="col-span-12 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Cities</span>
              <div className="flex items-center gap-1">
                 <button onClick={() => generateCities(Math.max(3, cities.length - 1))} disabled={isRunning} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"><Minus size={14}/></button>
                 <span className="w-6 text-center font-mono font-bold">{cities.length}</span>
                 <button onClick={() => generateCities(Math.min(6, cities.length + 1))} disabled={isRunning} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"><Plus size={14}/></button>
              </div>
              <div className="w-px h-5 bg-slate-300 mx-1"></div>
              <button 
                onClick={() => generateCities(cities.length)}
                disabled={isRunning} 
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors text-slate-600"
                title="Randomize Positions"
              >
                <Shuffle size={14} />
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex gap-2">
              <button 
                onClick={runBFS} 
                disabled={isRunning}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm active:transform active:scale-95"
              >
                <Play size={18} fill="currentColor" /> Run BFS
              </button>
              <button 
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                <RotateCcw size={18} /> Reset
              </button>
            </div>
          </div>

          <div className="flex gap-8">
             <div className="flex flex-col items-end">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
               <span className={`text-sm font-medium ${isRunning ? 'text-blue-600 animate-pulse' : 'text-slate-700'}`}>
                 {message}
               </span>
             </div>
             <div className="flex flex-col items-end min-w-[100px]">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Best Distance</span>
               <span className="text-xl font-mono font-bold text-emerald-600">
                 {bestDistance === null ? '—' : bestDistance.toFixed(1)}
               </span>
             </div>
          </div>
        </div>

        {error && (
          <div className="col-span-12 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* LEFT COLUMN: Map & Legend */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[360px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Network size={18} className="text-slate-500"/> Map View
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <MapView cities={cities} activePath={activePath} bestRoute={bestRoute} />
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm flex items-center gap-2">
              <Info size={16} /> Legend
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                   <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-600 shadow-sm"></div>
                </div>
                <span className="text-slate-600"><strong>Current Node:</strong> The city being processed</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center">
                    <div className="w-8 h-1 bg-amber-500"></div>
                 </div>
                 <span className="text-slate-600"><strong>Active Path:</strong> Route being explored</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                <span className="text-slate-600"><strong>Visited:</strong> Part of path history</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-emerald-500"></div>
                <span className="text-slate-600"><strong>Best Route:</strong> Shortest complete path</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tree Visualization */}
        <div className="col-span-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">State Space Tree</h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
              Level {activePath.length > 0 ? activePath.length - 1 : 0}
            </span>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            {treeRoot ? (
              <TreeDiagram 
                treeData={treeRoot} 
                activePath={activePath} 
                bestRoute={bestRoute} 
                width={750} 
                height={520} 
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                <GitGraph size={48} className="mb-3 opacity-20"/>
                <p className="font-medium">Tree will generate here</p>
                <p className="text-sm opacity-70">Click 'Run BFS' to start expansion</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TSPSimulator;