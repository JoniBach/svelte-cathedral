<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment'; // Import browser from SvelteKit

	export const cellTypeConfig = {
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

	export const validationRules = (cells) => [
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
	export const threeConfig = {
		lightConfig: {
			ambient: { color: 0xffffff, intensity: 0.5 },
			directional: { color: 0xffffff, intensity: 1, position: [10, 10, 10] }
		},
		cameraConfig: {
			fov: 75,
			near: 0.1,
			far: 1000,
			position: { y: 50 }
		},
		rendererConfig: {
			alpha: true,
			clearColor: 0x000000,
			clearAlpha: 0
		},
		controlsConfig: {
			enableDamping: true,
			maxPolarAngle: Math.PI / 2,
			minDistance: 10,
			maxDistance: 100
		}
	};

	let canvas;

	// Configurable board size
	const boardSize = [10, 10];
	let cells = [];

	// Initialize Three.js variables to null
	let scene = null;
	let camera = null;
	let renderer = null;
	let board = null;
	let raycaster = null;
	let mouse = null;
	let controls = null;
	let currentHoveredMesh = null;

	// Validation System
	const validationErrors = writable([]);

	// Event Handlers Lookup
	const eventHandlers = {
		toggleState: handleClick,
		highlight: handleHover
		// Add more event handlers as needed
	};

	// Event Handler Functions
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

	// Generate Board Configuration
	function generateBoardConfig([rows, cols]) {
		cells = Array.from({ length: rows * cols }, (_, index) => {
			const x = index % cols;
			const y = Math.floor(index / cols);
			return { cell: [x, y], type: 'default' };
		});
	}

	// Validation System
	function runValidations() {
		const errors = validationRules(cells)
			.filter((rule) => !rule.validate())
			.map((rule) => rule.message);
		validationErrors.set(errors);
	}

	onMount(() => {
		if (browser) {
			// Ensure client-side execution
			generateBoardConfig(boardSize);
			initThreeJS({
				canvasElement: canvas,
				boardDimensions: boardSize,
				cellDimensions: cellSize,
				threeConfig
			});
			createBoard();
			animate();
			runValidations();
			initializeEventHandlers();
		}
	});

	onDestroy(() => {
		if (browser) {
			// Ensure client-side cleanup
			disposeThreeJS();
			removeEventHandlers();
		}
	});

	const cellSize = 2;

	function initThreeJS({
		canvasElement,
		boardDimensions,
		cellDimensions,
		threeConfig: { lightConfig, cameraConfig, rendererConfig, controlsConfig }
	}) {
		const width = canvasElement.clientWidth;
		const height = canvasElement.clientHeight;

		scene = new THREE.Scene();

		// Lighting setup
		const ambientLight = new THREE.AmbientLight(
			lightConfig.ambient.color,
			lightConfig.ambient.intensity
		);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(
			lightConfig.directional.color,
			lightConfig.directional.intensity
		);
		directionalLight.position.set(...lightConfig.directional.position);
		scene.add(directionalLight);

		// Camera setup
		camera = new THREE.PerspectiveCamera(
			cameraConfig.fov,
			width / height,
			cameraConfig.near,
			cameraConfig.far
		);
		const centerX = ((boardDimensions[0] - 1) * cellDimensions) / 2;
		const centerY = ((boardDimensions[1] - 1) * cellDimensions) / 2;
		camera.position.set(centerX, cameraConfig.position.y, centerY);
		camera.lookAt(new THREE.Vector3(centerX, 0, centerY));

		// Renderer setup
		renderer = new THREE.WebGLRenderer({ canvas: canvasElement, alpha: rendererConfig.alpha });
		renderer.setSize(width, height);
		renderer.setClearColor(rendererConfig.clearColor, rendererConfig.clearAlpha);

		// Board group
		board = new THREE.Group();
		scene.add(board);

		// Raycaster for interaction
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();

		// Controls setup
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = controlsConfig.enableDamping;
		controls.maxPolarAngle = controlsConfig.maxPolarAngle;
		controls.minDistance = controlsConfig.minDistance;
		controls.maxDistance = controlsConfig.maxDistance;
	}

	function disposeThreeJS() {
		if (renderer && typeof renderer.dispose === 'function') {
			renderer.dispose();
		}
		if (controls && typeof controls.dispose === 'function') {
			controls.dispose();
		}
		if (scene && typeof scene.clear === 'function') {
			scene.clear();
		}
	}

	function initializeEventHandlers() {
		window.addEventListener('click', onMouseClick);
		window.addEventListener('mousemove', onMouseMove);
	}

	function removeEventHandlers() {
		window.removeEventListener('click', onMouseClick);
		window.removeEventListener('mousemove', onMouseMove);
	}

	function createBoard() {
		// Clear existing board
		while (board.children.length) {
			board.remove(board.children[0]);
		}

		const geometryCache = {}; // Cache geometries to avoid redundant creations

		cells.forEach(({ cell, type }, index) => {
			const [x, y] = cell;
			const config = cellTypeConfig[type] || cellTypeConfig.default;

			// Create or retrieve geometry from cache
			const geometryKey = `${config.geometry.type}-${config.geometry.args.join(',')}`;
			let geometry = geometryCache[geometryKey];
			if (!geometry) {
				switch (config.geometry.type) {
					case 'PlaneGeometry':
						geometry = new THREE.PlaneGeometry(...config.geometry.args);
						break;
					// Add other geometry types as needed
					default:
						geometry = new THREE.PlaneGeometry(...config.geometry.args);
				}
				geometryCache[geometryKey] = geometry;
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
		const intersectedMesh = getIntersectedMesh(event);
		if (intersectedMesh) {
			const currentType = intersectedMesh.userData.type;
			const cellConfig = cellTypeConfig[currentType] || cellTypeConfig.default;

			// Trigger click events
			const handlerName = cellConfig.events?.click;
			if (handlerName && eventHandlers[handlerName]) {
				eventHandlers[handlerName](intersectedMesh);
			}
		}
	}

	function onMouseMove(event) {
		const intersectedMesh = getIntersectedMesh(event);

		if (intersectedMesh !== currentHoveredMesh) {
			if (currentHoveredMesh) {
				// Reset previous hovered mesh appearance
				const prevConfig =
					cellTypeConfig[currentHoveredMesh.userData.type] || cellTypeConfig.default;
				currentHoveredMesh.material.opacity = prevConfig.material.opacity;
			}

			if (intersectedMesh) {
				// Apply hover appearance
				const handlerName = cellTypeConfig[intersectedMesh.userData.type]?.events?.hover;
				if (handlerName && eventHandlers[handlerName]) {
					eventHandlers[handlerName](intersectedMesh);
				}
			}

			currentHoveredMesh = intersectedMesh;
		}
	}

	function getIntersectedMesh(event) {
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(board.children, true);

		if (intersects.length > 0) {
			// Find the first intersected mesh with userData.type
			return intersects.find((obj) => obj.object.userData.type)?.object;
		}
		return null;
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
		if (controls) controls.update();
		if (renderer && scene && camera) renderer.render(scene, camera);
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
