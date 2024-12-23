<script>
	import { onMount } from 'svelte';
	import { PIECES, CATHEDRAL } from '../pieces.js';

	let rows = 10;
	let columns = 10;
	let player = 1;
	let turn = 1;

	const initGrid = () => {
		const defaultCell = (row, col) => ({
			id: `${row}-${col}`,
			status: null,
			owner: null,
			occupied: false
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

	const modifyCell = (selectedCell, selectedCells) => {
		if (validateCell(selectedCell)) {
			return {
				ownership: selectedCells.map((existingCell) =>
					existingCell.id === selectedCell.id ? { ...existingCell, owner: player } : existingCell
				),
				occupation: selectedCells.map((existingCell) =>
					existingCell.id === selectedCell.id ? { ...existingCell, occupied: true } : existingCell
				)
			};
		} else {
			alert('error');
		}
	};

	const modifyTurn = {
		end: () => {
			player === 1 ? (player = 2) : (player = 1);
			turn++;
		}
	};

	let grid = [];

	onMount(() => {
		grid = initGrid();
	});

	const cellClick = (cell) => {
		let newGrid = grid;
		newGrid = modifyCell(cell, newGrid).ownership;
		newGrid = modifyCell(cell, newGrid).occupation;
		grid = newGrid;
		modifyTurn.end();
	};

	$: console.log('Initialized grid:', grid);
</script>

<div class="grid" style="grid-template-columns: repeat({columns}, 1fr)">
	{#each grid as cell}
		<div class="cell player-{cell.owner} occupied-{cell.occupied}" on:click={() => cellClick(cell)}>
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
		background-color: lightgreen;
	}
	.cell.player-2.occupied-true {
		background-color: lightcoral;
	}
</style>
