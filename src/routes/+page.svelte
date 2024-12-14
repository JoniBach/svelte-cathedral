<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { onMount, onDestroy } from 'svelte';

	// ─────────────────────────────────────────────────────────────────────────────
	// CONFIG & CONSTANTS
	// ─────────────────────────────────────────────────────────────────────────────

	const GRID_MIN = -5;
	const GRID_MAX = 5;

	const PLAYERS = {
		1: { name: 'Player 1', color: 0x0077ff },
		2: { name: 'Player 2', color: 0xff0000 }
	};

	const PIECES = {
		Cathedral: [
			[1, 0, true],
			[0, 1, false],
			[1, 1, false],
			[2, 1, false],
			[1, 2, false],
			[1, 3, false]
		],
		Castle: [
			[0, 0, true],
			[1, 0, false],
			[0, 1, false],
			[0, 2, false],
			[1, 2, false]
		],
		Infirmiry: [
			[0, 0, true],
			[1, 0, false],
			[2, 0, false],
			[1, 1, false],
			[1, -1, false]
		],
		Academy: [
			[0, 0, true],
			[1, -1, false],
			[1, 0, false],
			[2, 0, false],
			[0, 1, false]
		],
		Abbey: [
			[0, 0, true],
			[1, 0, false],
			[0, 1, false],
			[1, -1, false]
		],
		Manor: [
			[0, 0, true],
			[1, 0, false],
			[1, 1, false],
			[2, 0, false]
		],
		Square: [
			[0, 0, true],
			[1, 0, false],
			[0, 1, false],
			[1, 1, false]
		],
		Bridge: [
			[0, 0, true],
			[1, 0, false],
			[2, 0, false]
		],
		Inn: [
			[0, 0, true],
			[1, 0, false],
			[0, 1, false]
		],
		Stable: [
			[0, 0, true],
			[1, 0, false]
		],
		Tavern: [[0, 0, true]]
	};

	function getInitialPlayerButtons() {
		return {
			1: [
				{ label: 'Cathedral', id: 'btnCathedralP1', count: 1, active: false, piece: null },
				{ label: 'Castle', id: 'btnCastleP1', count: 1, active: false, piece: null },
				{ label: 'Infirmiry', id: 'btnInfirmiryP1', count: 1, active: false, piece: null },
				{ label: 'Academy', id: 'btnAcademyP1', count: 1, active: false, piece: null },
				{ label: 'Abbey', id: 'btnAbbeyP1', count: 1, active: false, piece: null },
				{ label: 'Manor', id: 'btnManorP1', count: 1, active: false, piece: null },
				{ label: 'Square', id: 'btnSquareP1', count: 1, active: false, piece: null },
				{ label: 'Bridge', id: 'btnBridgeP1', count: 1, active: false, piece: null },
				{ label: 'Inn', id: 'btnInnP1', count: 2, active: false, piece: null },
				{ label: 'Stable', id: 'btnStableP1', count: 2, active: false, piece: null },
				{ label: 'Tavern', id: 'btnTavernP1', count: 2, active: false, piece: null }
			],
			2: [
				{ label: 'Cathedral', id: 'btnCathedralP2', count: 0, active: false, piece: null },
				{ label: 'Castle', id: 'btnCastleP2', count: 1, active: false, piece: null },
				{ label: 'Infirmiry', id: 'btnInfirmiryP2', count: 1, active: false, piece: null },
				{ label: 'Academy', id: 'btnAcademyP2', count: 1, active: false, piece: null },
				{ label: 'Abbey', id: 'btnAbbeyP2', count: 1, active: false, piece: null },
				{ label: 'Manor', id: 'btnManorP2', count: 1, active: false, piece: null },
				{ label: 'Square', id: 'btnSquareP2', count: 1, active: false, piece: null },
				{ label: 'Bridge', id: 'btnBridgeP2', count: 1, active: false, piece: null },
				{ label: 'Inn', id: 'btnInnP2', count: 2, active: false, piece: null },
				{ label: 'Stable', id: 'btnStableP2', count: 2, active: false, piece: null },
				{ label: 'Tavern', id: 'btnTavernP2', count: 2, active: false, piece: null }
			]
		};
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// GLOBAL STATE
	// ─────────────────────────────────────────────────────────────────────────────

	let canvas;
	let scene;
	let camera;
	let renderer;
	let controls;

	let playerButtons = getInitialPlayerButtons();
	let currentPlayer = 1;
	let player1CathedralPlaced = false;

	let hoverGroup = new THREE.Group();
	let hoverSquares = [];

	let placedPieces = [];

	let currentAction = {
		type: null,
		piece: null,
		label: null,
		dragging: false
	};

	const occupiedCells = new Set();

	const mouse = new THREE.Vector2();
	const raycaster = new THREE.Raycaster();

	const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	const cathedralMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
	const playerMaterials = {
		1: new THREE.MeshBasicMaterial({ color: PLAYERS[1].color }),
		2: new THREE.MeshBasicMaterial({ color: PLAYERS[2].color })
	};
	const hoverOpacity = 0.5;

	// ─────────────────────────────────────────────────────────────────────────────
	// UTILITY FUNCTIONS
	// ─────────────────────────────────────────────────────────────────────────────

	function canPlayerPlacePiece(player, label) {
		if (player === 1 && !player1CathedralPlaced && label !== 'Cathedral') {
			return false;
		}
		return true;
	}

	function removePieceFromScene(piece) {
		if (piece && scene) {
			scene.remove(piece);
		}
	}

	function deactivateAllButtons(player) {
		playerButtons[player] = playerButtons[player].map((b) => {
			if (b.active && b.piece) {
				removePieceFromScene(b.piece);
				b.piece = null;
			}
			return { ...b, active: false };
		});
	}

	function removeCurrentlyPlacedPiece() {
		if (currentAction.piece) {
			removePieceFromScene(currentAction.piece);
			const index = placedPieces.indexOf(currentAction.piece);
			if (index !== -1) placedPieces.splice(index, 1);
			currentAction.piece = null;
			currentAction.label = null;
			removeHoverSquares();
		}
	}

	function startPlacingPiece(player, label, btnIndex) {
		currentAction.type = 'place';
		currentAction.dragging = true;
		createNewPiece(player, label, btnIndex);
	}

	function cancelPlacingPiece() {
		currentAction.type = null;
		currentAction.dragging = false;
		currentAction.piece = null;
		currentAction.label = null;
		removeHoverSquares();
	}

	function createNewPiece(player, label, btnIndex) {
		const pattern = PIECES[label];
		if (!pattern) return;

		const btn = playerButtons[player][btnIndex];
		if (btn.count <= 0) return;

		const newPiece = createPieceMesh(pattern, player, label);
		scene.add(newPiece);
		placedPieces.push(newPiece);

		playerButtons[player][btnIndex] = { ...btn, piece: newPiece };

		currentAction.piece = newPiece;
		currentAction.label = label;

		createHoverSquares(pattern, player, label);
	}

	function createPieceMesh(pattern, player, label) {
		const group = new THREE.Group();
		const material = label === 'Cathedral' ? cathedralMaterial : playerMaterials[player];

		let anchorCube = null;
		for (let [x, z, isAnchor] of pattern) {
			const cube = new THREE.Mesh(cubeGeometry, material);
			cube.position.set(x, 0, z);
			if (isAnchor) anchorCube = cube;
			group.add(cube);
		}

		if (anchorCube) {
			group.position.set(-anchorCube.position.x, 0, -anchorCube.position.z);
		}

		group.userData = { player, pattern, label };
		return group;
	}

	function createHoverSquares(pattern, player, label) {
		removeHoverSquares();
		const hoverColor =
			player === 1 && !player1CathedralPlaced && label === 'Cathedral' ? 0xffffff : 0xaaaaaa;
		// : PLAYERS[player].color;

		const hoverMaterial = new THREE.MeshBasicMaterial({
			color: hoverColor,
			transparent: true,
			opacity: hoverOpacity
		});

		const piecePos = currentAction.piece
			? currentAction.piece.position
			: new THREE.Vector3(0, 0, 0);

		for (let [x, z] of pattern) {
			const planeGeometry = new THREE.PlaneGeometry(1, 1);
			const square = new THREE.Mesh(planeGeometry, hoverMaterial);
			square.rotation.x = -Math.PI / 2;
			square.position.set(piecePos.x + x, 0.01, piecePos.z + z);
			hoverGroup.add(square);
			hoverSquares.push(square);
		}
	}

	function removeHoverSquares() {
		hoverSquares.forEach((sq) => hoverGroup.remove(sq));
		hoverSquares = [];
	}

	function getPieceCells(piece) {
		// Compute which cells the piece occupies
		// Returns an array of cell keys ("x,z")
		const cells = [];
		const { pattern } = piece.userData;
		const piecePos = piece.position;
		for (let [px, pz] of pattern) {
			const cubeX = piecePos.x + px;
			const cubeZ = piecePos.z + pz;
			const cellX = Math.floor(cubeX);
			const cellZ = Math.floor(cubeZ);
			cells.push(`${cellX},${cellZ}`);
		}
		return cells;
	}

	/**
	 * Return an array of validation error messages for the current piece placement.
	 */
	function getValidationErrors(piece) {
		let errors = [];

		if (!piece) {
			errors.push('Choose a piece to place.');
			return errors;
		}

		if (currentAction.dragging) {
			errors.push('Place the piece on the grid before ending turn.');
		}

		const { pattern } = piece.userData;
		const piecePos = piece.position;

		for (let [px, pz] of pattern) {
			const cubeX = piecePos.x + px;
			const cubeZ = piecePos.z + pz;

			if (cubeX < GRID_MIN || cubeX > GRID_MAX || cubeZ < GRID_MIN || cubeZ > GRID_MAX) {
				errors.push('Part of the piece is outside the grid boundaries.');
				// If one is outside, no need to check others for boundary
				break;
			}
		}

		if (errors.length === 0) {
			// Check intersections if no boundary error
			const cells = getPieceCells(piece);
			for (const c of cells) {
				if (occupiedCells.has(c)) {
					errors.push('The piece intersects with another placed piece.');
					break;
				}
			}
		}

		return errors;
	}

	/**
	 * After confirming no errors, commit the piece placement to the occupiedCells.
	 */
	function commitPlacement(piece) {
		const cells = getPieceCells(piece);
		for (const c of cells) {
			occupiedCells.add(c);
		}
	}

	function finalizePlacement() {
		const label = currentAction.label;
		const piece = currentAction.piece;
		if (piece && label) {
			playerButtons[currentPlayer] = playerButtons[currentPlayer].map((b) => {
				if (b.label === label) {
					let newCount = b.count - 1;
					if (newCount < 0) newCount = 0;
					return { ...b, count: newCount, active: false, piece: null };
				}
				return { ...b, active: false, piece: null };
			});

			if (currentPlayer === 1 && label === 'Cathedral' && !player1CathedralPlaced) {
				player1CathedralPlaced = true;
			}
		}

		cancelPlacingPiece();
	}

	function rotatePattern(pattern, direction = 'clockwise') {
		const anchorIndex = pattern.findIndex(([x, z, a]) => a);
		if (anchorIndex === -1) return pattern;
		const [ax, az] = pattern[anchorIndex];

		const shifted = pattern.map(([x, z, a]) => [x - ax, z - az, a]);

		let rotated;
		if (direction === 'clockwise') {
			rotated = shifted.map(([x, z, a]) => [z, -x, a]);
		} else {
			rotated = shifted.map(([x, z, a]) => [-z, x, a]);
		}

		return rotated.map(([x, z, a]) => [x + ax, z + az, a]);
	}

	function updatePiecePattern(newPattern) {
		if (!currentAction.piece) return;

		const oldWorldPos = currentAction.piece.position.clone();
		const { player, label } = currentAction.piece.userData;

		currentAction.piece.userData.pattern = newPattern;

		while (currentAction.piece.children.length > 0) {
			const child = currentAction.piece.children.pop();
			currentAction.piece.remove(child);
		}

		const material = label === 'Cathedral' ? cathedralMaterial : playerMaterials[player];
		let anchorCube = null;
		for (let [x, z, isAnchor] of newPattern) {
			const cube = new THREE.Mesh(cubeGeometry, material);
			cube.position.set(x, 0, z);
			if (isAnchor) anchorCube = cube;
			currentAction.piece.add(cube);
		}

		if (anchorCube) {
			currentAction.piece.position.set(-anchorCube.position.x, 0, -anchorCube.position.z);
		}

		currentAction.piece.position.copy(oldWorldPos);

		removeHoverSquares();
		createHoverSquares(newPattern, player, label);
	}

	function rotatePieceClockwise() {
		if (!currentAction.piece || !currentAction.piece.userData.pattern) return;
		const rotatedPattern = rotatePattern(currentAction.piece.userData.pattern, 'clockwise');
		updatePiecePattern(rotatedPattern);
	}

	function rotatePieceCounterClockwise() {
		if (!currentAction.piece || !currentAction.piece.userData.pattern) return;
		const rotatedPattern = rotatePattern(currentAction.piece.userData.pattern, 'counterclockwise');
		updatePiecePattern(rotatedPattern);
	}

	function toggleButton(player, id) {
		if (player !== currentPlayer) return;

		const btnIndex = playerButtons[player].findIndex((btn) => btn.id === id);
		const btn = playerButtons[player][btnIndex];
		if (!canPlayerPlacePiece(player, btn.label)) return;

		const isActivating = !btn.active;

		if (isActivating) {
			deactivateAllButtons(player);
			removeCurrentlyPlacedPiece();

			if (btn.count > 0) {
				playerButtons[player][btnIndex] = { ...btn, active: true };
				startPlacingPiece(player, btn.label, btnIndex);
			}
		} else {
			if (btn.piece) {
				removePieceFromScene(btn.piece);
				const pieceIndex = placedPieces.indexOf(btn.piece);
				if (pieceIndex !== -1) placedPieces.splice(pieceIndex, 1);
			}
			playerButtons[player][btnIndex] = { ...btn, active: false, piece: null };
			cancelPlacingPiece();
		}
	}

	function endTurn() {
		const piece = currentAction.piece;
		const errors = getValidationErrors(piece);
		if (errors.length > 0) {
			// Invalid placement: revert
			if (piece) {
				removePieceFromScene(piece);
				const idx = placedPieces.indexOf(piece);
				if (idx !== -1) placedPieces.splice(idx, 1);

				playerButtons[currentPlayer] = playerButtons[currentPlayer].map((b) => {
					if (b.label === currentAction.label && b.piece === piece) {
						return { ...b, piece: null, active: false };
					}
					return b;
				});
			}
			cancelPlacingPiece();
			return;
		}

		// Valid placement: commit cells and finalize
		commitPlacement(piece);
		finalizePlacement();
		currentPlayer = currentPlayer === 1 ? 2 : 1;
	}

	// A computed value for validation errors
	// This will show current errors in real-time
	$: validationErrors = getValidationErrors(currentAction.piece);

	// A computed value to check if turn is valid (no errors, piece not dragging)
	// If there are no errors and a piece is placed and not dragging, it's valid
	function turnIsValid() {
		const piece = currentAction.piece;
		if (!piece) return false;
		if (currentAction.dragging) return false;
		return validationErrors.length === 0;
	}

	let handleMouseMove, handleMouseUp, handleMouseDown, handleResize;

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		controls.enableZoom = true;
		controls.maxPolarAngle = Math.PI / 2;

		const gridHelper = new THREE.GridHelper(10, 10);
		scene.add(gridHelper);
		scene.add(hoverGroup);

		camera.position.set(5, 5, 5);
		camera.lookAt(0, 0, 0);

		function animate() {
			requestAnimationFrame(animate);
			if (!currentAction.dragging) {
				controls.update();
			}
			renderer.render(scene, camera);
		}
		animate();

		handleResize = () => {
			if (typeof window !== 'undefined') {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize(window.innerWidth, window.innerHeight);
			}
		};

		handleMouseMove = (event) => {
			if (!currentAction.dragging || !currentAction.piece || currentAction.type !== 'place') return;
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);

			const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
			const intersectPoint = new THREE.Vector3();
			if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
				let snapX = Math.floor(intersectPoint.x) + 0.5;
				let snapZ = Math.floor(intersectPoint.z) + 0.5;

				if (snapX < GRID_MIN) snapX = GRID_MIN;
				if (snapX > GRID_MAX) snapX = GRID_MAX;
				if (snapZ < GRID_MIN) snapZ = GRID_MIN;
				if (snapZ > GRID_MAX) snapZ = GRID_MAX;

				const pattern = currentAction.piece.userData.pattern;
				currentAction.piece.position.set(snapX, 1.5, snapZ);
				hoverSquares.forEach((sq, i) => {
					sq.position.set(snapX + pattern[i][0], 0.01, snapZ + pattern[i][1]);
				});
			}
		};

		handleMouseUp = () => {
			if (currentAction.dragging && currentAction.piece && currentAction.type === 'place') {
				currentAction.piece.position.y = 0.5;
				hoverSquares.forEach((sq) => (sq.visible = false));
				controls.enabled = true;
				currentAction.dragging = false;
				currentAction.type = null;
			}
		};

		handleMouseDown = (event) => {
			if (!currentAction.dragging && currentAction.piece) {
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects([currentAction.piece], true);
				if (intersects.length > 0) {
					currentAction.dragging = true;
					currentAction.type = 'place';
					createHoverSquares(
						currentAction.piece.userData.pattern,
						currentAction.piece.userData.player,
						currentAction.label
					);
					currentAction.piece.position.y = 1.5;
					controls.enabled = false;
				}
			}
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('resize', handleResize);
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			window.addEventListener('mousedown', handleMouseDown);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('mousedown', handleMouseDown);
		}
	});
</script>

<div class="layout">
	<canvas bind:this={canvas}></canvas>

	<div class="button-overlay player1-overlay">
		<h3>{PLAYERS[1].name}</h3>
		{#each playerButtons[1] as { label, id, count, active }}
			<button
				{id}
				class:active
				on:click={() => toggleButton(1, id)}
				disabled={currentAction.dragging ||
					currentPlayer !== 1 ||
					count <= 0 ||
					!canPlayerPlacePiece(1, label)}
				title={count > 0 ? `${count} remaining` : 'No more available'}
			>
				{label}{count > 0 ? ` (${count})` : ''}
			</button>
		{/each}

		<button on:click={rotatePieceClockwise} disabled={!currentAction.piece || currentPlayer !== 1}>
			Rotate CW
		</button>
		<button
			on:click={rotatePieceCounterClockwise}
			disabled={!currentAction.piece || currentPlayer !== 1}
		>
			Rotate CCW
		</button>
	</div>

	<div class="button-overlay player2-overlay">
		<h3>{PLAYERS[2].name}</h3>
		{#each playerButtons[2] as { label, id, count, active }}
			<button
				{id}
				class:active
				on:click={() => toggleButton(2, id)}
				disabled={currentAction.dragging || currentPlayer !== 2 || count <= 0}
				title={count > 0 ? `${count} remaining` : 'No more available'}
			>
				{label}{count > 0 ? ` (${count})` : ''}
			</button>
		{/each}

		<button on:click={rotatePieceClockwise} disabled={!currentAction.piece || currentPlayer !== 2}>
			Rotate CW
		</button>
		<button
			on:click={rotatePieceCounterClockwise}
			disabled={!currentAction.piece || currentPlayer !== 2}
		>
			Rotate CCW
		</button>
	</div>

	<div class="turn-overlay">
		<h2>Current Turn: {PLAYERS[currentPlayer].name}</h2>
		<button on:click={endTurn} disabled={!turnIsValid()}>End Turn</button>
		<!-- Display validation errors if any -->
		{#if validationErrors.length > 0}
			<div class="validation-errors">
				<ul>
					{#each validationErrors as err}
						<li>{err}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

<style>
	.layout {
		position: relative;
		height: 100vh;
	}

	canvas {
		width: 100%;
		height: 100vh;
		display: block;
	}

	.button-overlay {
		position: absolute;
		top: 10px;
		width: 200px;
		display: flex;
		flex-direction: column;
		background: rgba(240, 240, 240, 0.9);
		padding: 10px;
		gap: 10px;
		border-radius: 5px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.player1-overlay {
		left: 10px;
	}

	.player2-overlay {
		right: 10px;
	}

	.turn-overlay {
		position: absolute;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.9);
		padding: 10px 20px;
		border-radius: 5px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.button-overlay h3,
	.turn-overlay h2 {
		margin-bottom: 10px;
		text-align: center;
		color: #333;
	}

	button {
		padding: 10px;
		font-size: 14px;
		cursor: pointer;
		border: none;
		background: white;
		transition:
			background 0.3s,
			color 0.3s;
		border-radius: 3px;
	}

	button.active {
		background: #0077ff;
		color: white;
	}

	button:disabled {
		background: #e0e0e0;
		cursor: not-allowed;
		color: #777;
	}

	.turn-overlay button {
		width: 100%;
		max-width: 150px;
	}

	.validation-errors {
		text-align: left;
		background: rgba(217, 217, 217, 0.9);
		padding: 10px;
		border-radius: 5px;
		width: 100%;
	}

	.validation-errors ul {
		margin: 0;
		padding-left: 20px;
	}
	.validation-errors li {
		color: #333;
		font-size: 14px;
	}

	* {
		margin: 0;
		box-sizing: border-box;
	}

	:global(body) {
		width: 100%;
		height: 100vh;
		margin: 0;
		overflow: hidden;
		font-family: Arial, sans-serif;
	}
</style>
