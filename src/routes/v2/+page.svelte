<script>
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
	import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

	let container;
	let camera, scene, renderer;
	let controls;
	$: cells = generateCells(10, 10, { type: 'default', color: 0xeeeeee });

	function generateCells(rows, cols, config) {
		const generatedCells = [];
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				generatedCells.push({ cell: [col, row], ...config });
			}
		}
		return generatedCells;
	}

	onMount(() => {
		init();
		animate();
	});

	function init() {
		container = document.getElementById('game-container');

		// Renderer
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		container.appendChild(renderer.domElement);

		// Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xeeeeee);

		// Camera
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.set(5, 8, 15);

		// Controls
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.maxPolarAngle = Math.PI / 2;

		// Grid
		const gridHelper = new THREE.GridHelper(10, 10, 0x000000, 0x000000);
		scene.add(gridHelper);

		// Add clickable cells
		addInteractiveCells();

		// Add legend based on cells
		addBoardLegend();

		window.addEventListener('resize', onWindowResize);
	}

	function addInteractiveCells() {
		const cellGeometry = new THREE.PlaneGeometry(1, 1);

		cells.forEach((cellObj) => {
			const {
				cell: [col, row],
				color
			} = cellObj;
			const cellMaterialDefault = new THREE.MeshBasicMaterial({ color });
			const cellMaterialActive = new THREE.MeshBasicMaterial({ color: 0xff0000 });

			const cellMesh = new THREE.Mesh(cellGeometry, cellMaterialDefault);
			cellMesh.position.set(col - 4.5, 0, row - 4.5);
			cellMesh.rotation.x = -Math.PI / 2;
			cellMesh.userData = { cellObj, cellMaterialDefault, cellMaterialActive };
			cellMesh.name = `cell-${col}-${row}`;
			scene.add(cellMesh);
		});

		container.addEventListener('pointerdown', onCellClick);
	}

	function onCellClick(event) {
		const pointer = new THREE.Vector2();
		const raycaster = new THREE.Raycaster();

		pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

		raycaster.setFromCamera(pointer, camera);
		const intersects = raycaster.intersectObjects(scene.children);

		if (intersects.length > 0) {
			const intersected = intersects[0].object;
			if (intersected.userData) {
				const { cellObj, cellMaterialDefault, cellMaterialActive } = intersected.userData;
				cellObj.type = cellObj.type === 'active' ? 'default' : 'active';
				intersected.material = cellObj.type === 'active' ? cellMaterialActive : cellMaterialDefault;
			}
		}
	}

	function addBoardLegend() {
		const fontLoader = new FontLoader();
		fontLoader.load(
			'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
			(font) => {
				cells.forEach(({ cell: [col, row] }) => {
					if (col === 0) {
						addTextLabel(`${row + 1}`, -5.5, 0.1, row - 4.5, font);
					}
					if (row === 0) {
						addTextLabel(`${col + 1}`, col - 4.5, 0.1, -5.5, font);
					}
				});
			}
		);
	}

	function addTextLabel(text, x, y, z, font) {
		const textGeometry = new TextGeometry(text, {
			font: font,
			size: 0.4,
			height: 0
		});
		textGeometry.center();
		const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
		const textMesh = new THREE.Mesh(textGeometry, textMaterial);
		textMesh.position.set(x, y, z);
		textMesh.rotation.x = -Math.PI / 2;
		scene.add(textMesh);
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function animate() {
		requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
	}
	$: console.log(cells);
</script>

<main>
	<button on:click={() => cells.shift()}>Remove First Item</button>
	<div id="game-container"></div>
</main>

<style>
	#game-container {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
</style>
