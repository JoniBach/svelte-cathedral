<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { onMount } from 'svelte';

	let canvas;
	let hoverSquares = [];
	let hoverGroup = new THREE.Group(); // Group for hover squares
	let isDragging = false;
	let mouse = new THREE.Vector2();
	let raycaster = new THREE.Raycaster();
	let selectedPiece = null; // Currently selected piece for dragging
	let actionType = null; // 'place' or 'move'

	const gridMin = -5;
	const gridMax = 5;

	// Define player properties
	const players = {
		1: { name: 'Player 1', color: 0x0077ff }, // Blue
		2: { name: 'Player 2', color: 0xff0000 } // Red
	};

	let currentPlayer = 1; // Start with Player 1

	// Track if Player 1 has placed the Cathedral
	let player1CathedralPlaced = false;

	// Flag to track if the current player has placed a piece this turn
	let hasPlacedPiece = false;

	// Define available pieces
	const pieces = {
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

	// Define buttons for both players with counts
	let playerButtons = {
		1: [
			{ label: 'Cathedral', id: 'btnCathedralP1', count: 1, active: false, piece: null },
			{ label: 'Castle', id: 'btnCastleP1', count: 1, active: false, piece: null },
			{ label: 'Infirmiry', id: 'btnInfirmiryP1', count: 2, active: false, piece: null },
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

	// Array to keep track of all placed pieces for easy access
	let placedPieces = [];

	function toggleButton(player, id) {
		// Only allow current player to toggle buttons
		if (player !== currentPlayer) return;

		const btnIndex = playerButtons[player].findIndex((btn) => btn.id === id);
		const btn = playerButtons[player][btnIndex];

		// If Player 1 hasn't placed the Cathedral yet, restrict to only 'Cathedral'
		if (player === 1 && !player1CathedralPlaced && btn.label !== 'Cathedral') {
			return;
		}

		// Prevent selection if count is zero or if a piece has already been placed this turn
		if (btn.count <= 0 || hasPlacedPiece) return;

		// Toggle the active state
		const isActivating = !btn.active;
		playerButtons[player] = playerButtons[player].map((btnItem, index) => ({
			...btnItem,
			active: index === btnIndex ? isActivating : false
		}));

		if (isActivating) {
			// If activating, create the piece
			actionType = 'place';
			changePiece(player, btn.label, btnIndex);
		} else {
			// If deactivating, remove the piece from the board
			if (btn.piece) {
				scene.remove(btn.piece);
				const pieceIndex = placedPieces.indexOf(btn.piece);
				if (pieceIndex !== -1) placedPieces.splice(pieceIndex, 1);
				btn.piece = null;
				btn.count += 1; // Restore the count
				// If the Cathedral was removed, update the state
				if (player === 1 && btn.label === 'Cathedral') {
					player1CathedralPlaced = false;
				}
				removeHoverSquares();
				selectedPiece = null;
				actionType = null;
				isDragging = false;
			}
		}
	}

	function changePiece(player, label, btnIndex) {
		const pattern = pieces[label];
		if (!pattern) return;

		// Check if the piece count is available
		const btn = playerButtons[player][btnIndex];
		if (btn.count <= 0) return;

		// Create a new piece and set it as the selected piece for dragging
		const newPiece = createPiece(pattern, player, label);
		scene.add(newPiece);
		createHoverSquares(pattern, player, actionType, label);
		selectedPiece = newPiece; // Set the new piece as the selected piece being dragged
		isDragging = true; // Set isDragging to true for placing
		placedPieces.push(newPiece); // Add to placed pieces array

		// Associate the piece with the button
		playerButtons[player][btnIndex].piece = newPiece;
	}

	function createPiece(pattern, player, label) {
		const group = new THREE.Group();
		let color;
		if (label === 'Cathedral') {
			color = 0xffffff; // White color for Cathedral
		} else {
			color = players[player].color; // Player's color for other pieces
		}
		const material = new THREE.MeshBasicMaterial({ color });
		let anchorCube = null;

		for (let [x, z, isAnchor] of pattern) {
			const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
			cube.position.set(x, 0, z);
			if (isAnchor) anchorCube = cube;
			group.add(cube);
		}

		if (anchorCube) {
			group.position.set(-anchorCube.position.x, 0, -anchorCube.position.z);
		}

		// Store player and pattern information in userData
		group.userData.player = player;
		group.userData.pattern = pattern;
		group.userData.label = label;

		return group;
	}

	function createHoverSquares(pattern, player, action, label) {
		// Remove existing hover squares
		removeHoverSquares();
		hoverSquares = [];
		let hoverColor;
		if (player === 1 && !player1CathedralPlaced && label === 'Cathedral') {
			hoverColor = 0xffffff; // White for Player 1's Cathedral
		} else {
			hoverColor = players[player].color; // Player's color for hover squares
		}
		const hoverMaterial = new THREE.MeshBasicMaterial({
			color: hoverColor,
			transparent: true,
			opacity: 0.5
		});
		for (let [x, z] of pattern) {
			const planeGeometry = new THREE.PlaneGeometry(1, 1);
			const square = new THREE.Mesh(planeGeometry, hoverMaterial);
			square.rotation.x = -Math.PI / 2;
			square.position.set(x, 0.01, z);
			hoverGroup.add(square); // Add to hoverGroup
			hoverSquares.push(square);
		}
	}

	function removeHoverSquares() {
		hoverSquares.forEach((sq) => hoverGroup.remove(sq));
		hoverSquares = [];
	}

	let scene;
	let camera;
	let renderer;
	let controls;

	onMount(() => {
		// Initialize Three.js Scene
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		controls.enableZoom = true;
		controls.maxPolarAngle = Math.PI / 2;

		// Add Grid Helper
		const gridHelper = new THREE.GridHelper(10, 10);
		scene.add(gridHelper);

		// Add hoverGroup to the scene
		scene.add(hoverGroup);

		// Set Camera Position
		camera.position.set(5, 5, 5);
		camera.lookAt(0, 0, 0);

		// Animation Loop
		function animate() {
			requestAnimationFrame(animate);
			if (!isDragging) {
				controls.update();
			}
			renderer.render(scene, camera);
		}

		animate();

		// Handle Window Resize
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		});

		// Mouse Down Event for Selecting Existing Pieces (for moving)
		window.addEventListener('mousedown', (event) => {
			// Update mouse coordinates
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);

			// Raycast only against placed pieces
			const intersects = raycaster.intersectObjects(placedPieces, true);

			if (intersects.length > 0) {
				const intersected = intersects[0].object.parent; // Get the parent group

				// Check if the intersected piece belongs to the current player
				if (intersected.userData.player === currentPlayer) {
					isDragging = true;
					controls.enabled = false;
					selectedPiece = intersected;
					actionType = 'move';
					createHoverSquares(
						selectedPiece.userData.pattern,
						currentPlayer,
						actionType,
						selectedPiece.userData.label
					);
					selectedPiece.position.y = 1.5; // Lift the piece for dragging
					hoverSquares.forEach((sq) => (sq.visible = true));
				}
			}
		});

		// Mouse Move Event for Dragging
		window.addEventListener('mousemove', (event) => {
			if (!isDragging || !selectedPiece) return;
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
			const intersects = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
			if (intersects) {
				let snapX = Math.floor(intersects.x) + 0.5;
				let snapZ = Math.floor(intersects.z) + 0.5;
				snapX = Math.max(gridMin + 0.5, Math.min(gridMax - 0.5, snapX));
				snapZ = Math.max(gridMin + 0.5, Math.min(gridMax - 0.5, snapZ));
				selectedPiece.position.set(snapX, 1.5, snapZ);
				hoverSquares.forEach((sq, i) => {
					sq.position.set(
						snapX + selectedPiece.userData.pattern[i][0],
						0.01,
						snapZ + selectedPiece.userData.pattern[i][1]
					);
				});
			}
		});

		// Mouse Up Event for Dragging
		window.addEventListener('mouseup', () => {
			if (isDragging && selectedPiece) {
				// Snap the piece to the grid
				selectedPiece.position.y = 0.5;
				hoverSquares.forEach((sq) => (sq.visible = false));
				controls.enabled = true;

				if (actionType === 'place') {
					// If placing a new piece, decrement the count
					const pieceLabel = selectedPiece.userData.label;
					const btn = playerButtons[currentPlayer].find((b) => b.label === pieceLabel);
					if (btn) {
						btn.count -= 1;
						if (btn.count < 0) btn.count = 0; // Ensure count doesn't go negative
					}

					// Update the button state to deactivate it and remove the piece association
					playerButtons[currentPlayer] = playerButtons[currentPlayer].map((b) => {
						if (b.label === pieceLabel) {
							return { ...b, active: false, piece: null };
						}
						return b;
					});

					// If Player 1 placed the Cathedral, update the state
					if (currentPlayer === 1 && pieceLabel === 'Cathedral' && !player1CathedralPlaced) {
						player1CathedralPlaced = true;
					}

					// Set the flag indicating a piece has been placed this turn
					hasPlacedPiece = true;
				} else if (actionType === 'move') {
					// If moving an existing piece, do not change counts
					// Additional logic can be added here if needed
				}

				// Reset selection
				selectedPiece = null;
				actionType = null;
				isDragging = false;
			}
		});
	});

	// End Turn Function
	function endTurn() {
		// Deselect any active piece from the menu
		playerButtons[currentPlayer] = playerButtons[currentPlayer].map((btn) => ({
			...btn,
			active: false
		}));
		selectedPiece = null;
		actionType = null;
		// Reset the placed piece flag for the new turn
		hasPlacedPiece = false;
		// Switch to the other player
		currentPlayer = currentPlayer === 1 ? 2 : 1;
	}
</script>

<div class="layout">
	<canvas bind:this={canvas}></canvas>
	<!-- Player 1 Menu -->
	<div class="button-overlay player1-overlay">
		<h3>{players[1].name}</h3>
		{#each playerButtons[1] as { label, id, count, active, piece }}
			<button
				{id}
				class:active
				on:click={() => toggleButton(1, id)}
				disabled={isDragging ||
					currentPlayer !== 1 ||
					(currentPlayer === 1 && !player1CathedralPlaced && label !== 'Cathedral') ||
					count <= 0 ||
					hasPlacedPiece}
				title={count > 0 ? `${count} remaining` : 'No more available'}
			>
				{label}
				{count > 0 ? ` (${count})` : ''}
			</button>
		{/each}
	</div>
	<!-- Player 2 Menu -->
	<div class="button-overlay player2-overlay">
		<h3>{players[2].name}</h3>
		{#each playerButtons[2] as { label, id, count, active, piece }}
			<button
				{id}
				class:active
				on:click={() => toggleButton(2, id)}
				disabled={isDragging || currentPlayer !== 2 || count <= 0 || hasPlacedPiece}
				title={count > 0 ? `${count} remaining` : 'No more available'}
			>
				{label}
				{count > 0 ? ` (${count})` : ''}
			</button>
		{/each}
	</div>
	<!-- Turn Overlay -->
	<div class="turn-overlay">
		<h2>Current Turn: {players[currentPlayer].name}</h2>
		<button on:click={endTurn} disabled={isDragging || !hasPlacedPiece}>End Turn</button>
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
