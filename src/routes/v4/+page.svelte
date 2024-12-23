<script>
	import { onMount } from 'svelte';
	import { PIECES } from '../pieces.js';

	let grid = [];
	const rows = 10,
		columns = 10;

	// Track active piece and piece counts
	let activePiece = null;
	let pieceCounts = Object.fromEntries(PIECES.map((piece) => [piece.name, 0]));

	// Initialize the grid
	const initGrid = () =>
		(grid = Array.from({ length: rows * columns }, (_, index) => ({
			cell: [Math.floor(index / columns), index % columns],
			id: 'default',
			hover: false
		})));

	// Check if a cell is available
	const isAvailable = ([row, col]) =>
		grid.find((cell) => cell.cell[0] === row && cell.cell[1] === col)?.id === 'default';

	// Update hover or occupied states
	const updateGrid = (callback) => {
		grid = grid.map((cell) => callback(cell));
	};

	const activateCells = (baseIndex) => {
		if (!activePiece) return;
		const pieceLimitReached = pieceCounts[activePiece.name] >= activePiece.count;
		if (pieceLimitReached) return alert(`${activePiece.name} placement limit reached.`);

		const baseCell = grid[baseIndex].cell;
		const canPlace = activePiece.cells.every(({ cell }) =>
			isAvailable([baseCell[0] + cell[0], baseCell[1] + cell[1]])
		);

		if (!canPlace) return alert(`Cannot place ${activePiece.name} due to overlap.`);

		pieceCounts[activePiece.name]++;
		updateGrid((cell) => {
			const isOccupied = activePiece.cells.some(
				(p) => p.cell[0] + baseCell[0] === cell.cell[0] && p.cell[1] + baseCell[1] === cell.cell[1]
			);
			return isOccupied ? { ...cell, id: activePiece.name } : cell;
		});
		calculateShading();
	};

	const calculateShading = () => {
		const visited = Array(rows)
			.fill()
			.map(() => Array(columns).fill(false));
		const markOutside = (x, y) => {
			if (x < 0 || y < 0 || x >= rows || y >= columns || visited[x][y] || !isAvailable([x, y]))
				return;
			visited[x][y] = true;
			[
				[-1, 0],
				[1, 0],
				[0, -1],
				[0, 1],
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1]
			].forEach(([dx, dy]) => markOutside(x + dx, y + dy));
		};

		[...Array(rows).keys()].forEach((i) => {
			markOutside(i, 0);
			markOutside(i, columns - 1);
		});
		[...Array(columns).keys()].forEach((j) => {
			markOutside(0, j);
			markOutside(rows - 1, j);
		});

		updateGrid((cell) => {
			const [row, col] = cell.cell;
			return !visited[row][col] && cell.id === 'default' ? { ...cell, id: 'shaded' } : cell;
		});
	};

	const rotatePiece = (direction) => {
		if (!activePiece) return;
		activePiece.cells = activePiece.cells.map(({ cell }) => ({
			cell: direction === 'clockwise' ? [cell[1], -cell[0]] : [-cell[1], cell[0]],
			id: activePiece.name
		}));
	};

	const togglePiece = (piece) => {
		activePiece = activePiece === piece ? null : piece;
	};

	const handleMouse = (baseIndex, hover) => {
		if (!activePiece) return;
		const baseCell = grid[baseIndex].cell;
		updateGrid((cell) => {
			const isHovered = activePiece.cells.some(
				(p) => p.cell[0] + baseCell[0] === cell.cell[0] && p.cell[1] + baseCell[1] === cell.cell[1]
			);
			return isHovered ? { ...cell, hover } : { ...cell, hover: false };
		});
	};

	onMount(initGrid);
</script>

<div class="grid">
	{#each grid as cell, index}
		<div
			on:click={() => activateCells(index)}
			on:mouseenter={() => handleMouse(index, true)}
			on:mouseleave={() => handleMouse(index, false)}
			class="cell {cell.id} {cell.hover ? 'hover' : ''}"
		>
			{cell.cell[0]},{cell.cell[1]}
		</div>
	{/each}
</div>

<div class="controls">
	{#each PIECES as piece}
		<button
			class:active={activePiece?.name === piece.name}
			on:click={() => togglePiece(piece)}
			disabled={pieceCounts[piece.name] >= piece.count}
		>
			{piece.name} ({piece.count - pieceCounts[piece.name]})
		</button>
	{/each}

	{#if activePiece}
		<button on:click={() => rotatePiece('clockwise')}>⟳</button>
		<button on:click={() => rotatePiece('counterclockwise')}>⟲</button>
	{/if}
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
		border-bottom: 1px solid black;
		border-right: 1px solid black;
		border-left: none;
		border-top: none;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		background-color: lightgray;
	}
	.cell.default {
		background-color: lightgray;
	}
	.cell.shaded {
		background-color: lightblue;
	}
	.cell.hover {
		background-color: yellow;
	}
	.cell:not(.default):not(.shaded) {
		background-color: lightcoral;
	}
	.controls {
		display: flex;
		margin-top: 8px;
	}
	.button.active {
		background-color: lightcoral;
	}
</style>
