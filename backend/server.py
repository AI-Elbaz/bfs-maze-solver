from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from typing import List, Generator, Dict, Any


class Point(BaseModel):
    r: int
    c: int

class MazeRequest(BaseModel):
    grid: List[List[int]]  # 0 = Empty, 1 = Wall
    start: Point
    end: Point


def bfs_maze_solver(
    grid: List[List[int]], 
    start: Point, 
    end: Point
) -> Generator[Dict[str, Any], None, None]:
    rows = len(grid)
    cols = len(grid[0])
    
    start_tuple = (start.r, start.c)
    queue = [[start_tuple]]
    visited = {start_tuple}
    
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]
    
    while queue:
        current_path = queue.pop(0)
        current_node = current_path[-1]
        
        yield {
            "type": "visit",
            "path": current_path,
            "cell": current_node
        }
        
        # Check if we reached the end
        if current_node[0] == end.r and current_node[1] == end.c:
            yield {
                "type": "solution",
                "path": current_path,
                "length": len(current_path)
            }
            
            yield {
                "type": "complete",
                "success": True
            }
            return
        
        # Expand neighbors
        for dr, dc in directions:
            nr, nc = current_node[0] + dr, current_node[1] + dc
            
            if (0 <= nr < rows and 
                0 <= nc < cols and 
                grid[nr][nc] == 0 and 
                (nr, nc) not in visited):
                
                visited.add((nr, nc))
                queue.append(current_path + [(nr, nc)])
    
    yield {
        "type": "complete",
        "success": False
    }


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def api_stream_wrapper(req: MazeRequest):
    for event in bfs_maze_solver(req.grid, req.start, req.end):
        yield json.dumps(event) + "\n"


@app.post("/api/maze")
async def run_maze(request: MazeRequest):
    return StreamingResponse(
        api_stream_wrapper(request),
        media_type="application/x-ndjson"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)