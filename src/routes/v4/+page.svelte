<script>
	import { onMount } from 'svelte';
	import { PIECES, CATHEDRAL } from '../pieces.js';

	// Game variables
	let grid = [];
	const rows = 10,
		columns = 10;

	let activePiece = null;
	let pieceCounts = { player1: {}, player2: {} };
	PIECES.forEach((piece) => {
		pieceCounts.player1[piece.name] = 0;
		pieceCounts.player2[piece.name] = 0;
	});

	let currentPlayer = 'player1';
	let scores = { player1: 0, player2: 0 };
	function placeCathedral() {
		activePiece = { ...CATHEDRAL, owner: null }; // No owner for the CPU piece

		// Rotate the piece randomly
		const randomRotation = Math.floor(Math.random() * 4);
		for (let i = 0; i < randomRotation; i++) {
			rotatePiece('clockwise');
		}

		// Function to check if the piece can be placed at a given position
		const canPlacePiece = (row, col) => {
			return activePiece.cells.every(({ cell }) => {
				const newRow = row + cell[0];
				const newCol = col + cell[1];
				return isAvailable([newRow, newCol]);
			});
		};

		// Find all valid positions
		const legalPositions = [];
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				if (canPlacePiece(row, col)) {
					legalPositions.push({ row, col });
				}
			}
		}

		if (legalPositions.length > 0) {
			// Choose a random valid position
			const randomIndex = Math.floor(Math.random() * legalPositions.length);
			const { row, col } = legalPositions[randomIndex];

			// Place the piece by updating grid cells directly
			const baseCell = grid[row * columns + col].cell;

			grid = grid.map((cell) =>
				activePiece.cells.some(
					(p) =>
						p.cell[0] + baseCell[0] === cell.cell[0] && p.cell[1] + baseCell[1] === cell.cell[1]
				)
					? { ...cell, id: 'cpu', owner: null } // Set `id` as 'cpu' and `owner` as null
					: cell
			);

			console.log(`Placed Cathedral at: Row ${row}, Column ${col}`);
			activePiece = null;
		} else {
			console.log('No legal position found for Cathedral');
		}
	}

	const initGrid = () => {
		grid = Array.from({ length: rows * columns }, (_, index) => ({
			cell: [Math.floor(index / columns), index % columns],
			id: 'default',
			owner: null,
			hover: false
		}));

		placeCathedral();
	};

	const getCell = ([row, col]) => grid.find((cell) => cell.cell[0] === row && cell.cell[1] === col);

	const isAvailable = ([row, col]) => {
		const cell = getCell([row, col]);
		if (!cell) return false;

		// Allow placement if the cell is 'default', 'shaded', or 'cpu' and owned by no one
		return (
			cell.id === 'default' ||
			(cell.id === 'shaded' && cell.owner === currentPlayer) ||
			(cell.id === 'cpu' && cell.owner === null)
		);
	};

	const updateGrid = (callback) => {
		grid = grid.map(callback);
	};

	const activateCells = (baseIndex) => {
		if (!activePiece || activePiece.owner !== currentPlayer) return;
		const { name, cells, count } = activePiece;

		if (pieceCounts[currentPlayer][name] >= count) {
			return alert(`${name} placement limit reached.`);
		}

		const baseCell = grid[baseIndex].cell;

		if (!cells.every(({ cell }) => isAvailable([baseCell[0] + cell[0], baseCell[1] + cell[1]]))) {
			return alert(`Cannot place ${name} due to overlap or invalid cells.`);
		}

		pieceCounts[currentPlayer][name]++;
		updateGrid((cell) =>
			cells.some(
				(p) => p.cell[0] + baseCell[0] === cell.cell[0] && p.cell[1] + baseCell[1] === cell.cell[1]
			)
				? { ...cell, id: name, owner: currentPlayer }
				: cell
		);
		calculateShading();
		calculateScores();
		switchTurn();
		activePiece = null;
	};

	const switchTurn = () => {
		currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
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
			if (!visited[row][col] && cell.id === 'default') {
				return { ...cell, id: 'shaded', owner: currentPlayer };
			}
			return cell;
		});
	};

	const calculateScores = () => {
		scores = { player1: 0, player2: 0 };
		grid.forEach((cell) => {
			if (cell.owner) scores[cell.owner]++;
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
		activePiece = activePiece === piece ? null : { ...piece, owner: currentPlayer };
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

	onMount(() => {
		initGrid();
		calculateShading();
	});
</script>

<div class="grid">
	{#each grid as cell, index}
		<div
			on:click={() => activateCells(index)}
			on:mouseenter={() => handleMouse(index, true)}
			on:mouseleave={() => handleMouse(index, false)}
			class="cell {cell.id} {cell.owner} {cell.hover ? 'hover' : ''}"
		>
			{cell.cell[0]},{cell.cell[1]}
		</div>
	{/each}
</div>

<div class="controls">
	{#each PIECES as piece}
		<button
			class:active={activePiece?.name === piece.name && activePiece.owner === currentPlayer}
			on:click={() => togglePiece(piece)}
			disabled={pieceCounts[currentPlayer][piece.name] >= piece.count}
		>
			{piece.name} ({piece.count - pieceCounts[currentPlayer][piece.name]})
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
	.cell.cpu {
		background-color: skyblue;
	}

	.cell.shaded {
		background-color: rgba(173, 216, 230, 0.5);
	}
	.cell.shaded.player1 {
		background-color: rgba(144, 238, 144, 0.5);
	}
	.cell.shaded.player2 {
		background-color: rgba(255, 182, 193, 0.5);
	}
	.cell.hover {
		background-color: yellow !important;
	}

	.cell.player1 {
		background-color: lightgreen;
	}
	.cell.player2 {
		background-color: lightpink;
	}
	.controls {
		display: flex;
		margin-top: 8px;
	}
	.button.active {
		background-color: lightcoral;
	}
	.scores {
		margin-top: 16px;
	}
</style>
