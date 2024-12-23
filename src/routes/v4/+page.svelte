<script>
	import { onMount } from 'svelte';

	let grid = [];
	const columns = 10;
	const rows = 10;

	// Initialize the grid
	const handleGrid = () => {
		const defaultCell = { cell: [0, 0], id: 'default' };

		const newGrid = [];
		for (let i = 0; i < columns; i++) {
			for (let j = 0; j < rows; j++) {
				newGrid.push({ ...defaultCell, cell: [i, j], id: 'default' });
			}
		}
		grid = newGrid;
	};

	// Toggle cell as part of the perimeter
	const activateCell = (cellIndex) => {
		grid = grid.map((cell, index) => {
			if (index === cellIndex) {
				return { ...cell, id: cell.id === 'active' ? 'default' : 'active' };
			}
			return cell;
		});
	};

	// Handle hover state
	const handleMouseEnter = (cellIndex) => {
		grid = grid.map((cell, index) => {
			if (index === cellIndex) {
				return { ...cell, hover: true };
			}
			return cell;
		});
	};

	const handleMouseLeave = (cellIndex) => {
		grid = grid.map((cell, index) => {
			if (index === cellIndex) {
				const { hover, ...rest } = cell; // Remove hover state
				return rest;
			}
			return cell;
		});
	};

	// Flood-fill to calculate and visually mark the shaded area
	const calculateAndShadeArea = () => {
		const grid2D = Array.from({ length: rows }, (_, i) =>
			grid.slice(i * columns, (i + 1) * columns)
		);

		const visited = Array(rows)
			.fill(null)
			.map(() => Array(columns).fill(false));

		// Determine if a cell is on the boundary (either "active" or out of bounds)
		const isBoundary = (x, y) => {
			return x < 0 || x >= rows || y < 0 || y >= columns || grid2D[x][y].id === 'active';
		};

		// Flood-fill algorithm considering corner neighbors
		const markOutside = (x, y) => {
			if (
				x < 0 ||
				x >= rows ||
				y < 0 ||
				y >= columns || // Out of bounds
				visited[x][y] || // Already visited
				grid2D[x][y].id === 'active' // Boundary cell
			) {
				return;
			}

			visited[x][y] = true;

			// Explore 8 neighbors (including diagonals)
			markOutside(x - 1, y); // Up
			markOutside(x + 1, y); // Down
			markOutside(x, y - 1); // Left
			markOutside(x, y + 1); // Right
			markOutside(x - 1, y - 1); // Top-left
			markOutside(x - 1, y + 1); // Top-right
			markOutside(x + 1, y - 1); // Bottom-left
			markOutside(x + 1, y + 1); // Bottom-right
		};

		// Start marking outside areas from edges
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < columns; j++) {
				if ((i === 0 || j === 0 || i === rows - 1 || j === columns - 1) && !visited[i][j]) {
					markOutside(i, j);
				}
			}
		}

		// Mark the inside area as "shaded"
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < columns; j++) {
				if (!visited[i][j] && grid2D[i][j].id === 'default') {
					grid2D[i][j].id = 'shaded';
				}
			}
		}

		// Flatten the 2D grid back to a 1D array
		grid = grid2D.flat();
	};

	onMount(() => {
		handleGrid();
	});

	$: {
		if (grid.length) {
			calculateAndShadeArea();
		}
	}
</script>

<div class="grid">
	{#each grid as cell, index}
		<div
			class="cell"
			title={`Cell: ${cell.cell[0]}, ${cell.cell[1]}`}
			on:click={() => activateCell(index)}
			on:mouseenter={() => handleMouseEnter(index)}
			on:mouseleave={() => handleMouseLeave(index)}
			style="background-color: 
					{cell.hover
				? 'yellow'
				: cell.id === 'active'
					? 'lightgreen'
					: cell.id === 'shaded'
						? 'lightblue'
						: 'lightgray'};"
		>
			{cell.cell[0]},{cell.cell[1]}
		</div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		width: 90%;
		height: 90%;
		max-width: 90vh;
		max-height: 90vw;
	}
	.cell {
		border: 1px solid black;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
	}
</style>
