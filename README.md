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

- Dequeues the first path (FIFO - First In, First Out)
- Extracts the last position in that path as the current node
- `pop(0)` ensures breadth-first order (explores level by level)

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

### Why BFS Finds the Shortest Path

1. **Level-by-level exploration**: All paths of length 1 are explored before length 2, etc.
2. **First solution is optimal**: The first time we reach the goal, we've found the shortest path
3. **Complete search**: BFS explores all reachable cells systematically

### Time and Space Complexity

- **Time**: O(rows × cols) - each cell visited at most once
- **Space**: O(rows × cols) - queue and visited set can grow to grid size