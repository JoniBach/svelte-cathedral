<script>
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { onMount } from 'svelte';

	let canvas;
	let cube;
	let hoverSquare;
	let isDragging = false;
	let mouse = new THREE.Vector2();
	let raycaster = new THREE.Raycaster();

	const gridMin = -5;
	const gridMax = 5;

	onMount(() => {
		// Create scene
		const scene = new THREE.Scene();

		// Create camera
		const camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);

		// Create renderer
		const renderer = new THREE.WebGLRenderer({ canvas });
		renderer.setSize(window.innerWidth, window.innerHeight);

		// Add OrbitControls
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		controls.enableZoom = true;
		controls.maxPolarAngle = Math.PI / 2; // Prevent going below the horizon

		// Add grid
		const gridHelper = new THREE.GridHelper(10, 10);
		scene.add(gridHelper);

		// Create a simple building piece (cube)
		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
		cube = new THREE.Mesh(geometry, material);
		cube.position.set(0, 0.5, 0);
		scene.add(cube);

		// Create hover square
		const hoverMaterial = new THREE.MeshBasicMaterial({
			color: 0x0077ff,
			transparent: true,
			opacity: 0.5
		});
		const planeGeometry = new THREE.PlaneGeometry(1, 1);
		hoverSquare = new THREE.Mesh(planeGeometry, hoverMaterial);
		hoverSquare.rotation.x = -Math.PI / 2;
		hoverSquare.visible = false;
		scene.add(hoverSquare);

		camera.position.set(5, 5, 5);
		camera.lookAt(0, 0, 0);

		// Animation loop
		function animate() {
			requestAnimationFrame(animate);
			if (!isDragging) {
				controls.update();
			}
			renderer.render(scene, camera);
		}

		animate();

		// Resize handling
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		});

		// Mouse interaction
		window.addEventListener('mousedown', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects([cube]);
			if (intersects.length > 0) {
				isDragging = true;
				controls.enabled = false;
				cube.position.y = 1.5; // Lift the cube on grab
				hoverSquare.visible = true; // Show hover square when grabbing
			}
		});

		window.addEventListener('mousemove', (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
			const intersects = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
			if (intersects) {
				const gridSize = 1; // Assuming grid cells are size 1x1
				let snapX = Math.floor(intersects.x / gridSize) + 0.5;
				let snapZ = Math.floor(intersects.z / gridSize) + 0.5;

				// Ensure snapping within grid bounds
				snapX = Math.max(gridMin + 0.5, Math.min(gridMax - 0.5, snapX));
				snapZ = Math.max(gridMin + 0.5, Math.min(gridMax - 0.5, snapZ));

				if (isDragging) {
					cube.position.set(snapX, 1.5, snapZ);
					hoverSquare.position.set(snapX, 0.01, snapZ);
				}
			}
		});

		window.addEventListener('mouseup', () => {
			if (isDragging) {
				cube.position.y = 0.5; // Drop the cube on release
				hoverSquare.visible = false; // Hide hover square on drop
				controls.enabled = true;
			}
			isDragging = false;
		});
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 100vh;
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
