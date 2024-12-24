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
				return match && !existingCell.occupied ? { ...existingCell, owner: player } : existingCell;
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

	const cellClick = (cell) => {
		if (!validateCell(cell)) {
			modifyTurn.end(false);
			alert('Invalid cell selection');
			return;
		}

		let newGrid = grid;
		newGrid = modifyCells.ownership([cell], newGrid);
		newGrid = modifyCells.occupation([cell], newGrid);
		let fillCells = getCellsToFill(newGrid);
		newGrid = modifyCells.ownership(fillCells, newGrid);

		grid = newGrid;
		modifyTurn.end(true);
	};

	$: console.log('Initialized grid:', grid);
</script>

<div class="grid" style="grid-template-columns: repeat({columns}, 1fr)">
	{#each grid as cell}
		<div
			class="cell player-{cell.owner} occupied-{cell.occupied} boundry-{cell.boundry}"
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
	.cell.boundry-true {
		background-color: lightgray;
	}
</style>
