<script>
	import { onMount } from 'svelte';
	import { PIECES, CATHEDRAL } from '../pieces.js';

	let rows = 12;
	let columns = 12;
	let player = 1;
	let turn = 1;

	const initGrid = () => {
		const defaultCell = (row, col) => ({
			id: `${row}-${col}`,
			status: null,
			owner: null,
			occupied: false,
			boundry: false
		});

		const cells = Array.from({ length: rows * columns }, (_, index) => {
			const row = Math.floor(index / columns);
			const col = index % columns;
			return defaultCell(row, col);
		});

		return cells;
	};

	const checkCellValidation = (cell) => [cell.owner === player || !cell.owner, !cell.occupied];

	const validateCell = (cell) => checkCellValidation(cell).every(Boolean);

	const getCell = (id) => grid.find((cell) => cell.id === id);

	const getCells = (ids) => ids.map((id) => getCell(id));

	const getOuterCells = (cells) => {
		return cells.filter((cell) => {
			const [row, col] = cell.id.split('-').map(Number);

			// Check if the cell is on the outer boundary
			return (
				row === 0 || // Top row
				row === rows - 1 || // Bottom row
				col === 0 || // Leftmost column
				col === columns - 1 // Rightmost column
			);
		});
	};

	const modifyCells = {
		ownership: (selectedCells, grid) => {
			return grid.map((existingCell) => {
				const match = selectedCells.find((cell) => cell.id === existingCell.id);
				// Update ownership regardless of occupied state for selected cells
				return match ? { ...existingCell, owner: player } : existingCell;
			});
		},

		occupation: (selectedCells, grid) => {
			return grid.map((existingCell) => {
				const match = selectedCells.find((cell) => cell.id === existingCell.id);
				return match ? { ...existingCell, occupied: true } : existingCell;
			});
		},
		boundry: (selectedCells, grid) => {
			return grid.map((existingCell) => {
				const match = selectedCells.find((cell) => cell.id === existingCell.id);
				return match ? { ...existingCell, boundry: true, occupied: true } : existingCell;
			});
		}
	};

	const modifyTurn = {
		end: (validAction) => {
			if (validAction) {
				player === 1 ? (player = 2) : (player = 1);
				turn++;
			}
		}
	};

	let grid = [];

	onMount(() => {
		grid = initGrid();
		let outerCells = getOuterCells(grid);
		grid = modifyCells.boundry(outerCells, grid);
		console.log('Outer cells:', outerCells);
	});

	const getCellsToFill = (grid) => {
		// Create a 2D grid representation for easier adjacency checks
		const grid2D = Array.from({ length: rows }, (_, row) =>
			grid.slice(row * columns, row * columns + columns)
		);

		const visited = new Set();
		const encapsulatedCells = new Set();

		// Direction vectors for adjacent cells (orthogonal and diagonal)
		const directions = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
			[-1, -1],
			[-1, 1],
			[1, -1],
			[1, 1]
		];

		const isInBounds = (row, col) => row >= 0 && row < rows && col >= 0 && col < columns;

		const floodFill = (row, col, playerOwner) => {
			const stack = [[row, col]];
			let boundaryReached = false;
			const region = [];

			while (stack.length > 0) {
				const [currentRow, currentCol] = stack.pop();
				const cellId = `${currentRow}-${currentCol}`;

				if (visited.has(cellId)) continue;

				visited.add(cellId);
				region.push(cellId);

				// Check if cell is at the boundary
				if (
					currentRow === 0 ||
					currentRow === rows - 1 ||
					currentCol === 0 ||
					currentCol === columns - 1
				) {
					boundaryReached = true;
				}

				// Check neighbors
				for (const [dRow, dCol] of directions) {
					const newRow = currentRow + dRow;
					const newCol = currentCol + dCol;

					if (isInBounds(newRow, newCol)) {
						const neighbor = grid2D[newRow][newCol];
						const neighborId = `${newRow}-${newCol}`;

						// Add to stack if not visited and not occupied by the player
						if (!visited.has(neighborId) && neighbor.owner !== playerOwner) {
							stack.push([newRow, newCol]);
						}
					}
				}
			}

			return { region, boundaryReached };
		};

		// Iterate over the grid and find encapsulated regions
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				const currentCell = grid2D[row][col];
				const cellId = `${row}-${col}`;

				if (!visited.has(cellId) && !currentCell.occupied) {
					const { region, boundaryReached } = floodFill(row, col, player);

					if (!boundaryReached) {
						// Add region to encapsulated cells if it's fully surrounded
						region.forEach((cell) => encapsulatedCells.add(cell));
					}
				}
			}
		}

		// Return encapsulated cells as an array
		return Array.from(encapsulatedCells).map((id) => getCell(id));
	};

	const getNeighbouringBoundryCells = (cell) => {
		const [row, col] = cell.id.split('-').map(Number);
		const directions = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1]
		];

		return directions
			.map(([dRow, dCol]) => {
				const newRow = row + dRow;
				const newCol = col + dCol;
				if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < columns) {
					return `${newRow}-${newCol}`;
				}
				return null; // Filter out invalid IDs
			})
			.filter(Boolean) // Remove null values
			.map((id) => getCell(id))
			.filter((cell) => cell && cell.boundry); // Ensure it's a valid boundary cell
	};

	const cellClick = (cell) => {
		if (!validateCell(cell)) {
			modifyTurn.end(false);
			alert('Invalid cell selection');
			return;
		}

		let newGrid = [...grid];

		// Update ownership and occupation for the clicked cell
		newGrid = modifyCells.ownership([cell], newGrid);
		newGrid = modifyCells.occupation([cell], newGrid);

		// Update ownership for any filled cells
		const fillCells = getCellsToFill(newGrid);
		newGrid = modifyCells.ownership(fillCells, newGrid);

		// Update ownership for neighboring boundary cells
		const boundaryCells = getNeighbouringBoundryCells(cell);
		newGrid = modifyCells.ownership(boundaryCells, newGrid);

		// Save updated grid
		grid = newGrid;

		// End turn after successful update
		modifyTurn.end(true);

		console.log('Updated grid:', grid); // Debugging
	};

	$: console.log('Initialized grid:', grid);
</script>

<div class="grid" style="grid-template-columns: repeat({columns}, 1fr)">
	{#each grid as cell}
		<div
			class="cell player-{cell.owner || 'none'} occupied-{cell.occupied} boundry-{cell.boundry}"
			on:click={() => cellClick(cell)}
		>
			{cell.id}
		</div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		width: 90%;
		height: 90%;
		max-width: 90vh;
		max-height: 90vw;
	}
	.cell {
		border-bottom: 1px solid black;
		border-right: 1px solid black;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		background-color: white;
	}
	.cell.player-1.occupied-true {
		background-color: green;
	}
	.cell.player-2.occupied-true {
		background-color: coral;
	}
	.cell.player-1.occupied-false {
		background-color: lightgreen;
	}
	.cell.player-2.occupied-false {
		background-color: lightcoral;
	}
	.cell.boundry-true.occupied-true.player-none {
		background-color: lightgray;
	}
	.cell.boundry-true.occupied-true.player-1 {
		background-color: darkgreen;
	}
	.cell.boundry-true.occupied-true.player-2 {
		background-color: darkorange;
	}
</style>
