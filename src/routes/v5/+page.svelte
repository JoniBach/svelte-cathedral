<script>
	import { onMount } from 'svelte';
	import { PIECES, CATHEDRAL } from '../pieces.js';

	let rows = 10;
	let columns = 10;
	let player = 1;

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

	const modifyCell = {
		ownership: (id) =>
			(grid = grid.map((cell) => (cell.id === id ? { ...cell, owner: player } : cell))),
		occupation: (id) =>
			(grid = grid.map((cell) => (cell.id === id ? { ...cell, occupied: true } : cell)))
	};

	let grid = [];

	onMount(() => {
		grid = initGrid();
	});

	const cellClick = (id) => {
		modifyCell.ownership(id);
		modifyCell.occupation(id);
	};

	$: console.log('Initialized grid:', grid);
</script>

<div class="grid" style="grid-template-columns: repeat({columns}, 1fr)">
	{#each grid as cell}
		<div class="cell player-{cell.owner}" on:click={() => cellClick(cell.id)}>
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
	.cell.player-1 {
		background-color: aqua;
	}
</style>
