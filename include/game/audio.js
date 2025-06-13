class AudioManager {
	constructor() {
		this.sounds = new Map()
		this.disabled = localStorage.getItem('soundDisabled') === 'true'
	}

	async loadSound(name, path) {
		const audio = new Audio(path)
		audio.preload = 'auto'
		
		return new Promise((resolve) => {
			audio.addEventListener('canplaythrough', () => {
					this.sounds.set(name, audio)
					resolve()
			}, { once: true })
		})
	}

	play(name) {
		if (this.disabled || !this.sounds.has(name)) return
		
		const audio = this.sounds.get(name)
		audio.currentTime = 0  // Reset to beginning
		audio.play().catch(e => console.log('Audio play failed:', e))
	}
	
	toggleSound() {
		this.disabled = !this.disabled
		localStorage.setItem('soundDisabled', this.disabled.toString())
		
		if (this.disabled) {
			this.pause()
		}
	}

	isSoundDisabled() {
		return this.disabled
	}
}