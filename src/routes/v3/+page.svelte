<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';

	let canvas;

	// Configurable board size
	const boardSize = [10, 10];
	let cells = [];

	let scene, camera, renderer, board, raycaster, mouse, controls;

	// Comprehensive cell type configuration with event configurations
	const cellTypeConfig = {
		default: {
			material: {
				color: 'gray',
				opacity: 0.5,
				side: THREE.DoubleSide,
				transparent: true
			},
			geometry: {
				type: 'PlaneGeometry',
				args: [2, 2]
			},
			initialRotation: { x: -Math.PI / 2, y: 0, z: 0 },
			border: {
				visible: true,
				color: 'black',
				thickness: 1
			},
			toggleTo: 'active',
			events: {
				click: 'toggleState'
			}
		},
		active: {
			material: {
				color: 'green',
				opacity: 0.8,
				side: THREE.DoubleSide,
				transparent: true
			},
			geometry: {
				type: 'PlaneGeometry',
				args: [2, 2]
			},
			initialRotation: { x: -Math.PI / 2, y: 0, z: 0 },
			border: {
				visible: true,
				color: 'black',
				thickness: 1
			},
			toggleTo: 'inactive',
			events: {
				click: 'toggleState'
			}
		},
		inactive: {
			material: {
				color: 'red',
				opacity: 0.8,
				side: THREE.DoubleSide,
				transparent: true
			},
			geometry: {
				type: 'PlaneGeometry',
				args: [2, 2]
			},
			initialRotation: { x: -Math.PI / 2, y: 0, z: 0 },
			border: {
				visible: true,
				color: 'black',
				thickness: 1
			},
			toggleTo: 'active',
			events: {
				click: 'toggleState'
			}
		}
		// Add more cell types as needed
	};

	// Event Handlers
	function handleClick(mesh) {
		const currentType = mesh.userData.type;
		const newType = cellTypeConfig[currentType]?.toggleTo || 'default';
		mesh.userData.type = newType;
		updateCellAppearance(mesh);
		runValidations();
	}

	function handleHover(mesh) {
		mesh.material.opacity = 1.0; // Example action on hover
	}

	// Event Lookup
	const eventHandlers = {
		toggleState: handleClick,
		highlight: handleHover
		// Add more event handlers as needed
	};

	function generateBoardConfig([rows, cols]) {
		cells = [];
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				cells.push({ cell: [x, y], type: 'default' });
			}
		}
	}

	// Validation System
	const validationErrors = writable([]);

	// Define Validation Rules
	const validationRules = [
		{
			// Rule: No inactive squares
			validate: () => {
				return !cells.some((cell) => cell.type === 'inactive');
			},
			message: 'There must be no inactive squares.'
		},
		{
			// Rule: At least 5 active squares
			validate: () => {
				const activeCount = cells.filter((cell) => cell.type === 'active').length;
				return activeCount >= 5;
			},
			message: 'There must be at least 5 active squares.'
		}
		// Add more rules as needed
	];

	function runValidations() {
		const errors = validationRules.filter((rule) => !rule.validate()).map((rule) => rule.message);
		validationErrors.set(errors);
	}

	onMount(() => {
		generateBoardConfig(boardSize);
		initThreeJS();
		animate();
		runValidations();

		// Clean up event listeners on destroy
		return () => {
			window.removeEventListener('click', onMouseClick);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('dblclick', onDoubleClick); // If implemented
		};
	});

	const cellSize = 2;

	function initThreeJS() {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		scene = new THREE.Scene();

		// Lighting setup
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(5, 10, 7.5);
		scene.add(directionalLight);

		// Camera setup
		camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		const centerX = ((boardSize[0] - 1) * cellSize) / 2;
		const centerY = ((boardSize[1] - 1) * cellSize) / 2;
		camera.position.set(centerX, 15, centerY);
		camera.lookAt(centerX, 0, centerY);

		// Renderer setup
		renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
		renderer.setSize(width, height);
		renderer.setClearColor(0x000000, 0);

		// Board group
		board = new THREE.Group();
		scene.add(board);

		// Raycaster for interaction
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();

		// Controls setup
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.maxPolarAngle = Math.PI / 2;
		controls.minDistance = 5;
		controls.maxDistance = 40;

		// Event listeners
		window.addEventListener('click', onMouseClick);
		window.addEventListener('mousemove', onMouseMove);

		// Create the board
		createBoard();
	}

	function createBoard() {
		// Clear existing board
		while (board.children.length) {
			board.remove(board.children[0]);
		}

		cells.forEach(({ cell, type }, index) => {
			const [x, y] = cell;
			const config = cellTypeConfig[type] || cellTypeConfig.default;

			// Create geometry
			let geometry;
			switch (config.geometry.type) {
				case 'PlaneGeometry':
					geometry = new THREE.PlaneGeometry(...config.geometry.args);
					break;
				// Add other geometry types as needed
				default:
					geometry = new THREE.PlaneGeometry(...config.geometry.args);
			}

			// Create material
			const material = new THREE.MeshBasicMaterial({ ...config.material });

			// Create cell mesh
			const cellMesh = new THREE.Mesh(geometry, material);
			cellMesh.position.set(x * config.geometry.args[0], 0, y * config.geometry.args[1]);
			cellMesh.rotation.set(
				config.initialRotation.x,
				config.initialRotation.y,
				config.initialRotation.z
			);
			cellMesh.userData = { type, cellIndex: `${x},${y}`, index };

			board.add(cellMesh);

			// Add borders if configured
			if (config.border && config.border.visible) {
				const borderGeometry = new THREE.EdgesGeometry(geometry);
				const borderMaterial = new THREE.LineBasicMaterial({ color: config.border.color });
				const border = new THREE.LineSegments(borderGeometry, borderMaterial);
				border.position.copy(cellMesh.position);
				border.rotation.copy(cellMesh.rotation);
				board.add(border);
			}
		});
	}

	function onMouseClick(event) {
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(board.children, true);

		if (intersects.length > 0) {
			// Find the first intersected mesh with userData.type
			const intersected = intersects.find((obj) => obj.object.userData.type);
			if (intersected) {
				const clickedMesh = intersected.object;
				const currentType = clickedMesh.userData.type;
				const cellConfig = cellTypeConfig[currentType] || cellTypeConfig.default;

				// Iterate through the events configured for this cell type
				for (const [eventName, handlerName] of Object.entries(cellConfig.events || {})) {
					if (eventName === 'click') {
						const handler = eventHandlers[handlerName];
						if (handler && typeof handler === 'function') {
							handler(clickedMesh);
						}
					}
				}
			}
		}
	}

	function onMouseMove(event) {
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(board.children, true);

		// Reset opacity for all cells
		board.children.forEach((child) => {
			if (child.userData.type) {
				const config = cellTypeConfig[child.userData.type] || cellTypeConfig.default;
				child.material.opacity = config.material.opacity;
			}
		});

		if (intersects.length > 0) {
			const intersected = intersects.find((obj) => obj.object.userData.type);
			if (intersected) {
				const hoveredMesh = intersected.object;
				const currentType = hoveredMesh.userData.type;
				const cellConfig = cellTypeConfig[currentType] || cellTypeConfig.default;

				// Iterate through the events configured for this cell type
				for (const [eventName, handlerName] of Object.entries(cellConfig.events || {})) {
					if (eventName === 'hover') {
						const handler = eventHandlers[handlerName];
						if (handler && typeof handler === 'function') {
							handler(hoveredMesh);
						}
					}
				}
			}
		}
	}

	function updateCellAppearance(mesh) {
		const config = cellTypeConfig[mesh.userData.type] || cellTypeConfig.default;
		mesh.material.color.set(config.material.color);
		mesh.material.opacity = config.material.opacity;

		// Update border if needed
		board.children.forEach((child) => {
			if (child.type === 'LineSegments' && child.position.equals(mesh.position)) {
				child.material.color.set(config.border.color);
			}
		});

		// Update the corresponding cell in the cells array
		const cellIndex = mesh.userData.index;
		if (cells[cellIndex]) {
			cells[cellIndex].type = mesh.userData.type;
		}
	}

	function animate() {
		requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
	}
</script>

<!-- UI for Displaying Validation Errors -->
<div
	style="position: absolute; top: 10px; left: 10px; z-index: 1; background: rgba(255, 255, 255, 0.8); padding: 10px; border-radius: 5px;"
>
	{#if $validationErrors.length > 0}
		<div style="color: red;">
			<ul>
				{#each $validationErrors as error}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div style="color: green;">All validation rules are satisfied.</div>
	{/if}
</div>

<canvas bind:this={canvas} style="width: 100%; height: 100%; display: block;"></canvas>

<style>
	body {
		margin: 0;
		overflow: hidden;
		height: 100vh;
		width: 100vw;
	}
</style>
