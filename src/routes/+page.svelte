<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { onMount } from 'svelte';

	let canvas;
	let currentPiece;
	let hoverSquares = [];
	let isDragging = false;
	let mouse = new THREE.Vector2();
	let raycaster = new THREE.Raycaster();

	const gridMin = -5;
	const gridMax = 5;

	function createPiece(pattern) {
		const group = new THREE.Group();
		const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
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

		return group;
	}

	function createHoverSquares(pattern) {
		hoverSquares.forEach((sq) => scene.remove(sq));
		hoverSquares = [];
		const hoverMaterial = new THREE.MeshBasicMaterial({
			color: 0x0077ff,
			transparent: true,
			opacity: 0.5
		});
		for (let [x, z] of pattern) {
			const planeGeometry = new THREE.PlaneGeometry(1, 1);
			const square = new THREE.Mesh(planeGeometry, hoverMaterial);
			square.rotation.x = -Math.PI / 2;
			square.position.set(x, 0.01, z);
			scene.add(square);
			hoverSquares.push(square);
		}
	}
	let pieces = {
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

	let buttons = [
		{ label: 'Cathedral', id: 'btnCathedral', active: true },
		{ label: 'Castle', id: 'btnCastle', active: false },
		{ label: 'Infirmiry', id: 'btnInfirmiry', active: false },
		{ label: 'Academy', id: 'btnAcademy', active: false },
		{ label: 'Abbey', id: 'btnAbbey', active: false },
		{ label: 'Manor', id: 'btnManor', active: false },
		{ label: 'Square', id: 'btnSquare', active: false },
		{ label: 'Bridge', id: 'btnBridge', active: false },
		{ label: 'Inn', id: 'btnInn', active: false },
		{ label: 'Stable', id: 'btnStable', active: false },
		{ label: 'Tavern', id: 'btnTavern', active: false }
	];

	function toggleButton(id) {
		buttons = buttons.map((btn) => ({
			...btn,
			active: btn.id === id
		}));
		changePiece();
	}

	function changePiece() {
		const activeButton = buttons.find((btn) => btn.active);
		if (currentPiece) currentPiece.parent.remove(currentPiece);
		currentPiece = createPiece(pieces[activeButton.label]);
		scene.add(currentPiece);
		createHoverSquares(pieces[activeButton.label]);
	}

	let scene;
	let camera;
	let renderer;
	let controls;

	onMount(() => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		renderer = new THREE.WebGLRenderer({ canvas });
		renderer.setSize(window.innerWidth, window.innerHeight);
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		controls.enableZoom = true;
		controls.maxPolarAngle = Math.PI / 2;

		const gridHelper = new THREE.GridHelper(10, 10);
		scene.add(gridHelper);

		changePiece();

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

		window.addEventListener('mousedown', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(currentPiece.children);
			if (intersects.length > 0) {
				isDragging = true;
				controls.enabled = false;
				currentPiece.position.y = 1.5;
				hoverSquares.forEach((sq) => (sq.visible = true));
			}
		});

		window.addEventListener('mousemove', (event) => {
			if (!isDragging) return;
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
				currentPiece.position.set(snapX, 1.5, snapZ);
				hoverSquares.forEach((sq, i) => {
					sq.position.set(
						snapX + pieces[buttons.find((btn) => btn.active).label][i][0],
						0.01,
						snapZ + pieces[buttons.find((btn) => btn.active).label][i][1]
					);
				});
			}
		});

		window.addEventListener('mouseup', () => {
			if (isDragging) {
				currentPiece.position.y = 0.5;
				hoverSquares.forEach((sq) => (sq.visible = false));
				controls.enabled = true;
			}
			isDragging = false;
		});
	});
</script>

<div class="layout">
	<canvas bind:this={canvas}></canvas>
	<div class="button-overlay">
		{#each buttons as { label, id, active }}
			<button {id} class:active on:click={() => toggleButton(id)}>{label}</button>
		{/each}
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
		left: 10px;
		display: flex;
		flex-direction: column;
		background: rgba(240, 240, 240, 0.9);
		padding: 10px;
		gap: 10px;
		border-radius: 5px;
	}

	button {
		padding: 10px;
		font-size: 16px;
		cursor: pointer;
		border: none;
		background: white;
	}

	button.active {
		background: #0077ff;
		color: white;
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
	}
</style>
