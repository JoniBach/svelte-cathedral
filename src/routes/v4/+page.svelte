<script>
	import { onMount } from 'svelte';
	import { PIECES } from '../pieces.js';

	let grid = [];
	const rows = 10,
		columns = 10;

	let activePiece = null;
	let pieceCounts = Object.fromEntries(PIECES.map((piece) => [piece.name, 0]));

	const initGrid = () =>
		(grid = Array.from({ length: rows * columns }, (_, index) => ({
			cell: [Math.floor(index / columns), index % columns],
			id: 'default',
			hover: false
		})));

	const getCell = ([row, col]) => grid.find((cell) => cell.cell[0] === row && cell.cell[1] === col);

	const isAvailable = ([row, col]) => getCell([row, col])?.id === 'default';

	const updateGrid = (callback) => {
		grid = grid.map(callback);
	};

	const activateCells = (baseIndex) => {
		if (!activePiece) return;
		const { name, cells, count } = activePiece;
		if (pieceCounts[name] >= count) return alert(`${name} placement limit reached.`);

		const baseCell = grid[baseIndex].cell;
		if (!cells.every(({ cell }) => isAvailable([baseCell[0] + cell[0], baseCell[1] + cell[1]]))) {
			return alert(`Cannot place ${name} due to overlap.`);
		}

		pieceCounts[name]++;
		updateGrid((cell) =>
			cells.some(
				(p) => p.cell[0] + baseCell[0] === cell.cell[0] && p.cell[1] + baseCell[1] === cell.cell[1]
			)
				? { ...cell, id: name }
				: cell
		);
		calculateShading();
	};

	const calculateShading = () => {
		const visited = Array(rows)
			.fill()
			.map(() => Array(columns).fill(false));

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

		const markOutside = (x, y) => {
			if (x < 0 || y < 0 || x >= rows || y >= columns || visited[x][y] || !isAvailable([x, y]))
				return;
			visited[x][y] = true;
			directions.forEach(([dx, dy]) => markOutside(x + dx, y + dy));
		};

		for (let i = 0; i < rows; i++) {
			markOutside(i, 0);
			markOutside(i, columns - 1);
		}
		for (let j = 0; j < columns; j++) {
			markOutside(0, j);
			markOutside(rows - 1, j);
		}

		updateGrid((cell) => {
			const [row, col] = cell.cell;
			return !visited[row][col] && cell.id === 'default' ? { ...cell, id: 'shaded' } : cell;
		});
	};

	const rotatePiece = (direction) => {
		if (!activePiece) return;
		const rotate = ([x, y]) => (direction === 'clockwise' ? [y, -x] : [-y, x]);
		activePiece.cells = activePiece.cells.map(({ cell }) => ({
			cell: rotate(cell),
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
			return { ...cell, hover: isHovered ? hover : false };
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
