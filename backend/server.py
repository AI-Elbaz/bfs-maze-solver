from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
import math
from typing import List, Generator, Any, Dict

class City(BaseModel):
    id: int
    x: float
    y: float

class BFSRequest(BaseModel):
    cities: List[City]

def calculate_distance(city1: City, city2: City) -> float:
    """Euclidean distance between two cities."""
    dx = city1.x - city2.x
    dy = city1.y - city2.y
    return math.sqrt(dx * dx + dy * dy)

def calculate_total_distance(route: List[int], cities: List[City]) -> float:
    """Calculates total distance of a route (including return to start)."""
    total = 0
    for i in range(len(route) - 1):
        total += calculate_distance(cities[route[i]], cities[route[i + 1]])
    if len(route) > 0:
        total += calculate_distance(cities[route[-1]], cities[route[0]])
    return total

def bfs_algorithm(cities: List[City]) -> Generator[Dict[str, Any], None, None]:
    if len(cities) == 0:
        return

    queue = [[0]]
    best_route = None
    best_distance = float('inf')
    explored_count = 0
    max_explore = 2000 

    yield {
        "type": "init",
        "route": [0],
        "message": "Start at City 0",
        "level": 0
    }

    while queue and explored_count < max_explore:
        current_path = queue.pop(0)
        explored_count += 1
        
        yield {
            "type": "processing",
            "route": current_path,
            "message": f"Processing node {current_path[-1]} at level {len(current_path)-1}",
            "bestDistance": best_distance,
            "queueSize": len(queue)
        }

        if len(current_path) == len(cities):
            distance = calculate_total_distance(current_path, cities)
            is_best = distance < best_distance
            
            if is_best:
                best_distance = distance
                best_route = current_path.copy()
            
            yield {
                "type": "leaf",
                "route": current_path,
                "distance": distance,
                "isBest": is_best,
                "bestRoute": best_route,
                "bestDistance": best_distance,
                "message": f"Route complete: {distance:.1f}"
            }
            continue
        
        children_added = False
        for i in range(len(cities)):
            if i not in current_path:
                new_path = current_path + [i]
                queue.append(new_path)
                children_added = True
                
                yield {
                    "type": "expand",
                    "parentPath": current_path,
                    "route": new_path,
                    "childCity": i,
                    "level": len(new_path) - 1,
                    "message": f"Discovered child {i}",
                    "bestDistance": best_distance
                }
        
        if children_added:
            yield {"type": "BATCH_COMPLETE"}

    yield {
        "type": "done",
        "bestRoute": best_route,
        "bestDistance": best_distance,
        "message": "BFS Complete"
    }

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def api_stream_wrapper(cities: List[City]):
    """
    Wraps the pure BFS algorithm to add:
    1. JSON Serialization
    2. Delays (asyncio.sleep) for visualization purposes
    3. Data sanitization (Infinity -> null)
    """
    
    algorithm_iterator = bfs_algorithm(cities)
    
    for step in algorithm_iterator:
        if step.get("type") == "BATCH_COMPLETE":
            await asyncio.sleep(0.1)
            continue
            
        # 1. Sanitize Data (JSON doesn't support Infinity)
        if "bestDistance" in step and step["bestDistance"] == float('inf'):
            step["bestDistance"] = None

        # 2. Timing Control based on event type
        if step["type"] == "init":
            await asyncio.sleep(0.5)
        elif step["type"] == "processing":
            await asyncio.sleep(0.1)
        
        # 3. Serialize and Yield
        yield json.dumps(step) + "\n"

@app.post("/api/bfs")
async def run_bfs(request: BFSRequest):
    return StreamingResponse(
        api_stream_wrapper(request.cities), 
        media_type="application/x-ndjson"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)