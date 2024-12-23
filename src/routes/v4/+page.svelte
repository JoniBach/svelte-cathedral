<script>
	import { onMount } from 'svelte';
	import { PIECES, PIECE } from '../pieces.js';

	let grid = [];
	const columns = 10;
	const rows = 10;

	let pieceCounts = Object.fromEntries(PIECES.map((piece) => [piece.name, 0]));

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

	const activateCells = (baseIndex) => {
		if (!activePiece) return;

		if (pieceCounts[activePiece.name] >= activePiece.count) {
			alert(`${activePiece.name} has reached its placement limit.`);
			return;
		}

		const [baseRow, baseCol] = grid[baseIndex].cell;

		// Check if all cells for the piece are available
		const canPlace = activePiece.cells.every((pieceCell) => {
			const targetRow = baseRow + pieceCell.cell[0];
			const targetCol = baseCol + pieceCell.cell[1];
			const targetCell = grid.find(
				(cell) => cell.cell[0] === targetRow && cell.cell[1] === targetCol
			);
			return targetCell && targetCell.id === 'default';
		});

		if (!canPlace) {
			alert(`Cannot place ${activePiece.name} here due to overlap.`);
			return;
		}

		// Place the piece
		let placed = false;
		grid = grid.map((cell) => {
			const [row, col] = cell.cell;

			if (
				activePiece.cells.some(
					(pieceCell) => pieceCell.cell[0] === row - baseRow && pieceCell.cell[1] === col - baseCol
				)
			) {
				if (cell.id === 'default') {
					placed = true;
					return { ...cell, id: activePiece.name };
				}
			}
			return cell;
		});

		if (placed) {
			pieceCounts[activePiece.name]++;
			calculateAndShadeArea();
		}
	};

	const handleMouseEnter = (baseIndex) => {
		if (!activePiece) return;

		const [baseRow, baseCol] = grid[baseIndex].cell;

		grid = grid.map((cell) => {
			const [row, col] = cell.cell;

			if (
				activePiece.cells.some(
					(pieceCell) => pieceCell.cell[0] === row - baseRow && pieceCell.cell[1] === col - baseCol
				)
			) {
				return { ...cell, hover: true };
			}
			return cell;
		});
	};

	const handleMouseLeave = () => {
		grid = grid.map((cell) => {
			if (cell.hover) {
				const { hover, ...rest } = cell;
				return rest;
			}
			return cell;
		});
	};

	const calculateAndShadeArea = () => {
		const grid2D = Array.from({ length: rows }, (_, i) =>
			grid.slice(i * columns, (i + 1) * columns)
		);

		const visited = Array(rows)
			.fill(null)
			.map(() => Array(columns).fill(false));

		const isBoundary = (x, y) => {
			return x < 0 || x >= rows || y < 0 || y >= columns || grid2D[x][y].id !== 'default';
		};

		const markOutside = (x, y) => {
			if (
				x < 0 ||
				x >= rows ||
				y < 0 ||
				y >= columns ||
				visited[x][y] ||
				grid2D[x][y].id !== 'default'
			) {
				return;
			}

			visited[x][y] = true;

			markOutside(x - 1, y);
			markOutside(x + 1, y);
			markOutside(x, y - 1);
			markOutside(x, y + 1);
			markOutside(x - 1, y - 1);
			markOutside(x - 1, y + 1);
			markOutside(x + 1, y - 1);
			markOutside(x + 1, y + 1);
		};

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < columns; j++) {
				if ((i === 0 || j === 0 || i === rows - 1 || j === columns - 1) && !visited[i][j]) {
					markOutside(i, j);
				}
			}
		}

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < columns; j++) {
				if (!visited[i][j] && grid2D[i][j].id === 'default') {
					grid2D[i][j].id = 'shaded';
				}
			}
		}

		grid = grid2D.flat();
	};

	const rotateClockwise = () => {
		if (!activePiece) return;
		activePiece.cells = activePiece.cells.map(({ cell }) => ({
			cell: [cell[1], -cell[0]],
			id: activePiece.name
		}));
	};

	const rotateCounterClockwise = () => {
		if (!activePiece) return;
		activePiece.cells = activePiece.cells.map(({ cell }) => ({
			cell: [-cell[1], cell[0]],
			id: activePiece.name
		}));
	};

	onMount(() => {
		handleGrid();
	});

	let activePiece = null;

	const togglePiece = (piece) => {
		if (activePiece === piece) {
			activePiece = null;
		} else {
			activePiece = piece;
		}
	};
</script>

<div class="grid">
	{#each grid as cell, index}
		<div
			class="cell"
			title={`Cell: ${cell.cell[0]}, ${cell.cell[1]}`}
			on:click={() => activateCells(index)}
			on:mouseenter={() => handleMouseEnter(index)}
			on:mouseleave={() => handleMouseLeave()}
			style="background-color: 
					{cell.hover
				? 'yellow'
				: cell.id === 'active'
					? 'lightgreen'
					: cell.id === 'shaded'
						? 'lightblue'
						: cell.id !== 'default'
							? 'lightcoral'
							: 'lightgray'};"
		>
			{cell.cell[0]},{cell.cell[1]}
		</div>
	{/each}
</div>

<div class="controls">
	{#each PIECES as piece}
		<button
			class={activePiece?.name === piece.name ? 'active' : ''}
			on:click={() => togglePiece(piece)}
			disabled={pieceCounts[piece.name] >= piece.count}
		>
			{piece.name} ({piece.count - pieceCounts[piece.name]})
		</button>
	{/each}

	{#if activePiece}
		<button on:click={rotateClockwise}> ⟳ </button>
		<button on:click={rotateCounterClockwise}> ⟲ </button>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		margin-top: 4px;
	}
	.active {
		background-color: lightcoral;
	}
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
