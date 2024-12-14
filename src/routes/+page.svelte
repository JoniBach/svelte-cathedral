<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { onMount } from 'svelte';

	let canvas;
	let hoverSquares = [];
	let hoverGroup = new THREE.Group();
	let isDragging = false;
	let mouse = new THREE.Vector2();
	let raycaster = new THREE.Raycaster();
	let selectedPiece = null;
	let selectedPieceLabel = null;
	let actionType = null; // 'place' when a piece is currently being positioned

	const gridMin = -5;
	const gridMax = 5;

	const players = {
		1: { name: 'Player 1', color: 0x0077ff },
		2: { name: 'Player 2', color: 0xff0000 }
	};

	let currentPlayer = 1;
	let player1CathedralPlaced = false;

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

	let placedPieces = [];

	function toggleButton(player, id) {
		if (player !== currentPlayer) return;

		const btnIndex = playerButtons[player].findIndex((btn) => btn.id === id);
		const btn = playerButtons[player][btnIndex];

		if (player === 1 && !player1CathedralPlaced && btn.label !== 'Cathedral') {
			return;
		}

		const isActivating = !btn.active;

		if (isActivating) {
			// Deactivate all other buttons and remove their pieces
			playerButtons[player] = playerButtons[player].map((b, idx) => {
				if (b.active && b.piece) {
					scene.remove(b.piece);
					const pieceIndex = placedPieces.indexOf(b.piece);
					if (pieceIndex !== -1) placedPieces.splice(pieceIndex, 1);
					b.piece = null;
				}
				return { ...b, active: false };
			});

			// If a piece is currently placed this turn, remove it before adding a new one
			if (selectedPiece) {
				scene.remove(selectedPiece);
				const index = placedPieces.indexOf(selectedPiece);
				if (index !== -1) placedPieces.splice(index, 1);
				selectedPiece = null;
				selectedPieceLabel = null;
				removeHoverSquares();
			}

			if (btn.count > 0) {
				playerButtons[player][btnIndex] = { ...btn, active: true };
				actionType = 'place';
				changePiece(player, btn.label, btnIndex);
				isDragging = true;
			}
		} else {
			// Turning off the same button:
			if (btn.piece) {
				scene.remove(btn.piece);
				const pieceIndex = placedPieces.indexOf(btn.piece);
				if (pieceIndex !== -1) placedPieces.splice(pieceIndex, 1);
				btn.piece = null;
			}
			playerButtons[player][btnIndex] = { ...btn, active: false };
			removeHoverSquares();
			selectedPiece = null;
			selectedPieceLabel = null;
			actionType = null;
			isDragging = false;
		}
	}

	function changePiece(player, label, btnIndex) {
		const pattern = pieces[label];
		if (!pattern) return;
		const btn = playerButtons[player][btnIndex];
		if (btn.count <= 0) return;

		const newPiece = createPiece(pattern, player, label);
		scene.add(newPiece);
		createHoverSquares(pattern, player, 'place', label);
		selectedPiece = newPiece;
		selectedPieceLabel = label;
		placedPieces.push(newPiece);
		playerButtons[player][btnIndex] = { ...btn, piece: newPiece };
	}

	function createPiece(pattern, player, label) {
		const group = new THREE.Group();
		let color = label === 'Cathedral' ? 0xffffff : players[player].color;
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

		group.userData.player = player;
		group.userData.pattern = pattern;
		group.userData.label = label;
		return group;
	}

	function createHoverSquares(pattern, player, action, label) {
		removeHoverSquares();
		hoverSquares = [];
		let hoverColor =
			player === 1 && !player1CathedralPlaced && label === 'Cathedral'
				? 0xffffff
				: players[player].color;
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
			hoverGroup.add(square);
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
			if (!isDragging) {
				controls.update();
			}
			renderer.render(scene, camera);
		}
		animate();

		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		});

		window.addEventListener('mousemove', (event) => {
			if (!isDragging || !selectedPiece || actionType !== 'place') return;

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

		window.addEventListener('mouseup', () => {
			if (isDragging && selectedPiece && actionType === 'place') {
				// Drop the piece in place
				selectedPiece.position.y = 0.5;
				hoverSquares.forEach((sq) => (sq.visible = false));
				controls.enabled = true;

				// Don't decrement count or finalize yet. Player can still change or move piece.
				isDragging = false;
				actionType = null;
			}
		});
	});

	function endTurn() {
		// Finalize the chosen piece
		if (selectedPiece && selectedPieceLabel) {
			// Decrement the count of the chosen piece
			playerButtons[currentPlayer] = playerButtons[currentPlayer].map((b) => {
				if (b.label === selectedPieceLabel) {
					let newCount = b.count - 1;
					if (newCount < 0) newCount = 0;
					return { ...b, count: newCount, active: false, piece: null };
				}
				return { ...b, active: false, piece: null };
			});

			if (currentPlayer === 1 && selectedPieceLabel === 'Cathedral' && !player1CathedralPlaced) {
				player1CathedralPlaced = true;
			}
		}

		selectedPiece = null;
		selectedPieceLabel = null;
		actionType = null;
		isDragging = false;

		// Switch player
		currentPlayer = currentPlayer === 1 ? 2 : 1;
	}
</script>

<div class="layout">
	<canvas bind:this={canvas}></canvas>

	<div class="button-overlay player1-overlay">
		<h3>{players[1].name}</h3>
		<!-- Cathedral button -->
		<button
			id="btnCathedralP1"
			class:active={playerButtons[1][0].active}
			on:click={() => toggleButton(1, 'btnCathedralP1')}
			disabled={isDragging ||
				currentPlayer !== 1 ||
				playerButtons[1][0].count <= 0 ||
				(!player1CathedralPlaced && playerButtons[1][0].label !== 'Cathedral')}
			title={playerButtons[1][0].count > 0
				? `${playerButtons[1][0].count} remaining`
				: 'No more available'}
		>
			{playerButtons[1][0].label}{playerButtons[1][0].count > 0
				? ` (${playerButtons[1][0].count})`
				: ''}
		</button>

		{#each playerButtons[1].slice(1) as { label, id, count, active }}
			<button
				{id}
				class:active
				on:click={() => toggleButton(1, id)}
				disabled={isDragging ||
					currentPlayer !== 1 ||
					count <= 0 ||
					(!player1CathedralPlaced && label !== 'Cathedral')}
				title={count > 0 ? `${count} remaining` : 'No more available'}
			>
				{label}{count > 0 ? ` (${count})` : ''}
			</button>
		{/each}
	</div>

	<div class="button-overlay player2-overlay">
		<h3>{players[2].name}</h3>
		{#each playerButtons[2] as { label, id, count, active }}
			<button
				{id}
				class:active
				on:click={() => toggleButton(2, id)}
				disabled={isDragging || currentPlayer !== 2 || count <= 0}
				title={count > 0 ? `${count} remaining` : 'No more available'}
			>
				{label}{count > 0 ? ` (${count})` : ''}
			</button>
		{/each}
	</div>

	<div class="turn-overlay">
		<h2>Current Turn: {players[currentPlayer].name}</h2>
		<button on:click={endTurn}>End Turn</button>
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
