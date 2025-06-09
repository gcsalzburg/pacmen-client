'use strict';

const keyToDirection = {
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right'
}

// When page loads
document.addEventListener("DOMContentLoaded", () => {

	// Connect when page loads
	connect();
	
});

let ws;
let heldKeys = new Set();

// Connect to PartyKit server
function connect() {
	// Replace with your actual PartyKit URL
	ws = new WebSocket('ws://localhost:1999/party/main');
	
	ws.onopen = () => {
		console.log('Connected to Pacman server');
	};
	
	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		if (data.type === 'gameState') {
			console.log('Game state:', data.data);
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
