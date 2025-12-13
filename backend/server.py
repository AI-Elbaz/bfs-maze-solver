from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
from typing import List, Generator, Any, Dict


class Point(BaseModel):
    r: int
    c: int

class MazeRequest(BaseModel):
    grid: List[List[int]]  # 0 = Empty, 1 = Wall
    start: Point
    end: Point

def create_event(event_type: str, **kwargs) -> Dict[str, Any]:
    payload = {"type": event_type}
    payload.update(kwargs)
    return payload


def bfs_maze_solver(grid: List[List[int]], start: Point, end: Point) -> Generator[Dict[str, Any], None, None]:
    rows = len(grid)
    cols = len(grid[0])

    # Queue stores: [Path Array of (r, c) tuples]
    # We store the full path to visualize the tree branches
    start_tuple = (start.r, start.c)
    queue = [[start_tuple]]

    # Global Visited set to prevent cycles and ensure shortest path
    visited = {start_tuple}

    # 4 Directions: Up, Right, Down, Left
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]

    # 1. Init
    yield create_event(
        "init",
        route=[start_tuple],
        message=f"Starting at ({start.r}, {start.c})",
        level=0
    )

    found_solution = False

    while queue:
        current_path = queue.pop(0)
        current_node = current_path[-1]  # (r, c)

        # 2. Processing
        yield create_event(
            "processing",
            route=current_path,
            currentNode=current_node,
            message=f"Scanning neighbors of ({current_node[0]}, {current_node[1]})",
            queueSize=len(queue)
        )

        # Check Win Condition
        if current_node[0] == end.r and current_node[1] == end.c:
            found_solution = True
            yield create_event(
                "leaf",
                route=current_path,
                isSolution=True,
                solutionLength=len(current_path),
                message=f"Target found! Length: {len(current_path)}"
            )
            break

        # Expand Neighbors
        children_added = False
        for dr, dc in directions:
            nr, nc = current_node[0] + dr, current_node[1] + dc

            # Check Bounds, Walls, and Visited
            if 0 <= nr < rows and 0 <= nc < cols:
                if grid[nr][nc] == 0 and (nr, nc) not in visited:
                    visited.add((nr, nc))

                    new_path = current_path + [(nr, nc)]
                    queue.append(new_path)
                    children_added = True

                    # 3. Expansion
                    yield create_event(
                        "expand",
                        parentPath=current_path,
                        route=new_path,
                        childNode=(nr, nc),
                        level=len(new_path) - 1,
                        message=f"Discovered ({nr}, {nc})"
                    )

        if children_added:
            yield create_event("BATCH_COMPLETE")

    if found_solution:
        yield create_event(
            "done",
            success=True,
            message="Maze Solved"
        )
    else:
        yield create_event(
            "done",
            success=False,
            message="No path found to target!"
        )


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def api_stream_wrapper(req: MazeRequest):
    algorithm_iterator = bfs_maze_solver(req.grid, req.start, req.end)

    for step in algorithm_iterator:
        if step.get("type") == "BATCH_COMPLETE":
            await asyncio.sleep(0.05)
            continue

        if step["type"] == "init":
            await asyncio.sleep(0.5)
        elif step["type"] == "processing":
            await asyncio.sleep(0.02)

        yield json.dumps(step) + "\n"


@app.post("/api/maze")
async def run_maze(request: MazeRequest):
    return StreamingResponse(
        api_stream_wrapper(request),
        media_type="application/x-ndjson"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
