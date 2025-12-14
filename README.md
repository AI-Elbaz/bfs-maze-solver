# Maze BFS Visualizer

A real-time visualization of the **Breadth-First Search (BFS)** algorithm solving a maze, built with **Python (FastAPI)** and **React**.

## 🚀 How to Run

You only need **Docker** installed on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/AI-Elbaz/bfs-maze-solver.git
cd bfs-maze-solver
```

### 2. Start the App
Run this command in the root folder:
```bash
docker compose up
```

### 3. Open in Browser
*   **Visualizer:** [http://localhost:5173](http://localhost:5173)
*   **Backend API:** [http://localhost:8000](http://localhost:8000)

---

**To stop the application:**
Press `Ctrl+C` in your terminal.
Then
```bash
docker compose down
```

## What is BFS?

**Breadth-First Search (BFS)** is a graph traversal algorithm that explores all nodes at the current depth before moving to nodes at the next depth level. In maze solving, this guarantees finding the shortest path.

### Core Algorithm Components

#### 1. Initialization
```python
start_tuple = (start.r, start.c)
queue = [[start_tuple]]
visited = {start_tuple}
```

- **Queue**: Stores paths (not just nodes). Each element is a complete path from start to current position
- **Visited set**: Tracks explored cells to prevent revisiting
- **Initial state**: Queue contains one path with just the starting position

#### 2. Direction Vectors
```python
directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]
```

These represent movement in 4 directions:
- `(-1, 0)`: Up (decrease row)
- `(0, 1)`: Right (increase column)
- `(1, 0)`: Down (increase row)
- `(0, -1)`: Left (decrease column)

#### 3. Main Loop
```python
while queue:
    current_path = queue.pop(0)
    current_node = current_path[-1]
```

- **`queue.pop(0)`** removes and returns the **first** element from the list (FIFO - First In, First Out)
- Extracts the last position in that path as the current node
- This creates FIFO behavior: paths added earlier are processed before paths added later

**Why FIFO matters for BFS:**
- Paths are added to the queue with `queue.append(...)` (adds to the end)
- Paths are removed with `queue.pop(0)` (removes from the beginning)
- This ensures we explore all length-N paths before any length-(N+1) paths

#### 4. Goal Check
```python
if current_node[0] == end.r and current_node[1] == end.c:
    # Solution found!
```

Checks if current position matches the end position. When found, the path is guaranteed to be shortest due to BFS properties.

#### 5. Neighbor Expansion
```python
for dr, dc in directions:
    nr, nc = current_node[0] + dr, current_node[1] + dc
    
    if (0 <= nr < rows and 
        0 <= nc < cols and 
        grid[nr][nc] == 0 and 
        (nr, nc) not in visited):
        
        visited.add((nr, nc))
        queue.append(current_path + [(nr, nc)])
```

For each direction:
1. Calculate new position: `(nr, nc)`
2. Validate the move:
   - Within grid bounds
   - Not a wall (`grid[nr][nc] == 0`)
   - Not previously visited
3. Mark as visited
4. Create new path by appending new position to current path
5. Add new path to queue

### Step-by-Step Example

Let's trace through a simple 5x5 maze:

```
S = Start (0,0)
E = End (2,4)
# = Wall
. = Empty

S . . # .
. # . # .
. . . . E
# # . # .
. . . . .
```

**Initial State:**
- Queue: `[[(0,0)]]` - one path containing just the start
- Visited: `{(0,0)}`

**Iteration 1:** Pop path `[(0,0)]`, current position is `(0,0)`
- Check neighbors: Up (out of bounds), Right `(0,1)`, Down `(1,0)`, Left (out of bounds)
- Valid neighbors: `(0,1)` and `(1,0)` - both empty and unvisited
- Add to queue: `[[(0,0), (0,1)]]` and `[[(0,0), (1,0)]]`
- Visited: `{(0,0), (0,1), (1,0)}`

**Iteration 2:** Pop path `[(0,0), (0,1)]`, current position is `(0,1)`
- Check neighbors: Up (out of bounds), Right `(0,2)`, Down `(1,1)` (wall!), Left `(0,0)` (visited)
- Valid neighbors: only `(0,2)`
- Add to queue: `[[(0,0), (1,0)], [(0,0), (0,1), (0,2)]]`
- Visited: `{(0,0), (0,1), (1,0), (0,2)}`

**Iteration 3:** Pop path `[(0,0), (1,0)]`, current position is `(1,0)`
- Check neighbors: Up `(0,0)` (visited), Right `(1,1)` (wall!), Down `(2,0)`, Left (out of bounds)
- Valid neighbors: only `(2,0)`
- Add to queue: `[[(0,0), (0,1), (0,2)], [(0,0), (1,0), (2,0)]]`

**This continues...** The algorithm explores all paths level-by-level until one reaches `(2,4)`.

### Key Insight: Path Storage

**Critical:** The queue stores complete paths, not just positions!
- Each queue element is a list: `[(0,0), (0,1), (0,2)]`
- When we find the goal, we immediately have the complete path
- We don't need to reconstruct the path backward

### Why BFS Finds the Shortest Path

1. **Level-by-level exploration**: All paths of length 1 are explored before length 2, length 2 before length 3, etc.
2. **First solution is optimal**: The first path that reaches the goal has the fewest steps
3. **Complete search**: BFS explores all reachable cells systematically

### Time and Space Complexity

- **Time**: O(rows × cols) - each cell visited at most once
- **Space**: O(rows × cols) - queue and visited set can grow to grid size
- **Note**: Space includes storing full paths, which can be memory-intensive for large mazes