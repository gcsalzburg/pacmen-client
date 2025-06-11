'use strict';

const keyToDirection = {
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right'
}

let direction = 'right'

// When page loads
document.addEventListener("DOMContentLoaded", () => {

	// Connect when page loads
	connect();

	const container = document.querySelector('main');
	const block = document.querySelector('.block');

	let containerRect = container.getBoundingClientRect();

	// request animation frame and move the block 10px in direction defined by direction
	requestAnimationFrame(function moveBlock() {
		if (block) {
			let blockRect = block.getBoundingClientRect();

			// Move the block based on the current direction at a defined speed (e.g., 10px/s)
			const speed = 500; // pixels per second
			const now = performance.now();
			if (!block.lastMoveTime) block.lastMoveTime = now;
			const deltaTime = (now - block.lastMoveTime) / 1000; // seconds
			const moveAmount = speed * deltaTime;

			let top = parseFloat(block.style.top) || blockRect.top - containerRect.top;
			let left = parseFloat(block.style.left) || blockRect.left - containerRect.left;

			switch (direction) {
				case 'up':
					top -= moveAmount;
					break;
				case 'down':
					top += moveAmount;
					break;
				case 'left':
					left -= moveAmount;
					break;
				case 'right':
					left += moveAmount;
					break;
			}

			block.style.top = `${top}px`;
			block.style.left = `${left}px`;
			block.lastMoveTime = now;
			
		//	// If block reaches edge of container, then lap
			if (blockRect.top < 0) {
				block.style.top = `${containerRect.height - blockRect.height}px`;
			}else if (blockRect.left < 0){
				block.style.left = `${containerRect.width - blockRect.width}px`;				
			}else if (blockRect.top > containerRect.height) {
				block.style.top = '0px';
			}else if (blockRect.left > containerRect.width) {
				block.style.left = '0px';
			}
		}
		requestAnimationFrame(moveBlock);
	});
	
});

let ws;
let heldKeys = new Set();

// Connect to PartyKit server
function connect() {
	// Replace with your actual PartyKit URL
	ws = new WebSocket('https://my-partykit-game.gcsalzburg.partykit.dev/party/main');
	
	ws.onopen = () => {
		console.log('Connected to Pacman server');
	};
	
	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		if (data.type === 'gameState') {
			console.log('dir:', data.data.currentDirection.vertical ?? data.data.currentDirection.horizontal);
			direction = data.data.currentDirection.vertical ?? data.data.currentDirection.horizontal;
		}
	};
	
	ws.onclose = () => {
		console.log('Disconnected from server');
		// Reconnect after 1 second
		setTimeout(connect, 1000);
	};
	
	ws.onerror = (error) => {
		console.error('WebSocket error:', error);
	};
}

// Send key down event
function sendKeyDown(key) {
	if (ws && ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({
			type: 'press',
			direction: key
		}));
	}
}

// Send key up event
function sendKeyUp(key) {
	if (ws && ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({
			type: 'release',
			direction: key
		}));
	}
}

// Handle keydown events
document.addEventListener('keydown', (event) => {
	// Only handle arrow keys
	if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
		event.preventDefault();

  		const direction = keyToDirection[event.key]
		
		// Only send if key wasn't already held down
		if (!heldKeys.has(event.key)) {
			heldKeys.add(event.key);
			sendKeyDown(direction);
			console.log('Press:', direction);
		}
	}
});

// Handle keyup events
document.addEventListener('keyup', (event) => {
	// Only handle arrow keys
	if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
		event.preventDefault();
		
  		const direction = keyToDirection[event.key]

		// Only send if key was actually held down
		if (heldKeys.has(event.key)) {
			heldKeys.delete(event.key);
			sendKeyUp(direction);
			console.log('Release:', direction);
		}
	}
});

// Handle window focus/blur to reset held keys
window.addEventListener('blur', () => {
	// Send key up for all held keys when window loses focus
	heldKeys.forEach(key => {
		sendKeyUp(key);
		console.log('Key up (window blur):', key);
	});
	heldKeys.clear();
});
