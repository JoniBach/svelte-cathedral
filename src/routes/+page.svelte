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

	let buttons = [
		{ label: '1x1', id: 'btn1x1', active: false },
		{ label: '1x2', id: 'btn1x2', active: false },
		{ label: '2x2', id: 'btn2x2', active: false }
	];

	function toggleButton(id) {
		buttons = buttons.map((btn) => ({
			...btn,
			active: btn.id === id ? !btn.active : false
		}));
	}

	onMount(() => {
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		const renderer = new THREE.WebGLRenderer({ canvas });
		renderer.setSize(window.innerWidth, window.innerHeight);
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		controls.enableZoom = true;
		controls.maxPolarAngle = Math.PI / 2;

		const gridHelper = new THREE.GridHelper(10, 10);
		scene.add(gridHelper);

		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
		cube = new THREE.Mesh(geometry, material);
		cube.position.set(0, 0.5, 0);
		scene.add(cube);

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
			const intersects = raycaster.intersectObjects([cube]);
			if (intersects.length > 0) {
				isDragging = true;
				controls.enabled = false;
				cube.position.y = 1.5;
				hoverSquare.visible = true;
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
				cube.position.set(snapX, 1.5, snapZ);
				hoverSquare.position.set(snapX, 0.01, snapZ);
			}
		});

		window.addEventListener('mouseup', () => {
			if (isDragging) {
				cube.position.y = 0.5;
				hoverSquare.visible = false;
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

	.canvas {
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
