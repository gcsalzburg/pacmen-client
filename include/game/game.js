class Game {
	constructor(opts) {
		// Game state
		this.state = WAITING
		this.stateChanged = true
		this.tick = 0
		this.level = 0
		this.eatenCount = 0
		this.timerStart = null
		this.lastTime = 0
		this.stored = null
		
		// Game objects
		this.audio = null
		this.ghosts = []
		this.ghostPos = []
		this.userPos = null
		this.map = null
		this.player = null
		this.ctx = null
		
		// Setup DOM
		this.wrapper = opts.container
		this.dom = {
			score : opts.score,
			lives : opts.lives,
			level : opts.level,
			sound : opts.sound,
			message: opts.message
		}

		this.init()
	}

	getTick() {
		return this.tick
	}

	async init() {
		const blockSize = this.wrapper.offsetWidth / 19
		const canvas = document.createElement("canvas")
		canvas.style.position = "absolute"
		
		// Calculate actual canvas size
		const canvasWidth = blockSize * 19
		const canvasHeight = blockSize * 22
		
		// Set canvas size for crisp rendering
		const pixelRatio = window.devicePixelRatio || 1
		
		// Set the actual size in memory (scaled to account for extra pixel density)
		canvas.width = canvasWidth * pixelRatio
		canvas.height = canvasHeight * pixelRatio
		
		// Set the size the element appears on the page
		canvas.style.width = canvasWidth + "px"
		canvas.style.height = canvasHeight + "px"

		this.wrapper.appendChild(canvas)
		this.ctx = canvas.getContext('2d')
		
		// Scale the drawing context so everything draws at the higher resolution
		this.ctx.scale(pixelRatio, pixelRatio)

		// Create game objects
		this.audio = new AudioManager()
		this.map = new GameMap(blockSize)
		this.player = new Player({
			"completedLevel": () => this.completedLevel(),
			"eatenPill": () => this.eatenPill()
		}, this.map)

		// Create ghosts
		const ghostSpecs = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"]
		for (let i = 0; i < ghostSpecs.length; i++) {
			const ghost = new Ghost({"getTick": () => this.getTick()}, this.map, ghostSpecs[i])
			this.ghosts.push(ghost)
		}
		
		this.map.draw(this.ctx)
		this.dialog("Loading ...")

		await this.loadAudio()
		this.dom.sound.addEventListener("click", () => {
			this.audio.toggleSound()
		})

		document.addEventListener("keydown", (e) => {
			this.player.keyDown(e)
		}, true)
		document.addEventListener("keypress", (e) => {
			e.preventDefault()
			e.stopPropagation()
		}, true)
		
		// Start a new game as soon as page loads
		this.startNewGame()

		// Begin!
		this.startMainLoop()
	}

	async loadAudio() {
		const audioFiles = [
			["start", "assets/audio/opening_song.mp3"],
			["die", "assets/audio/die.mp3"],
			["eatghost", "assets/audio/eatghost.mp3"],
			["eatpill", "assets/audio/eatpill.mp3"],
			["eating", "assets/audio/eating.short.mp3"],
			["eating2", "assets/audio/eating.short.mp3"]
		]

		try {
			await Promise.all(
				audioFiles.map(([name, path]) => this.audio.loadSound(name, path))
			)
		} catch (error) {
			console.log('Some audio files failed to load:', error)
		}
	}

	startMainLoop() {
		let lastTime = performance.now();
		const frameDuration = 1000 / Pacman.FPS;

		const loop = (now) => {
			if (now - lastTime >= frameDuration) {
				this.mainLoop();
				lastTime = now;
			}
			requestAnimationFrame(loop);
		};

		requestAnimationFrame(loop);
	}

	dialog(text) {
		this.dom.message.textContent = text
	}

	soundDisabled() {
		return this.audio.isSoundDisabled()
	}

	startLevel() {
		this.player.resetPosition()
		for (let i = 0; i < this.ghosts.length; i++) {
			this.ghosts[i].reset()
		}
		this.audio.play("start")
		this.timerStart = this.tick
		this.setState(COUNTDOWN)
	}

	startNewGame() {
		this.setState(WAITING)
		this.level = 1
		this.player.reset()
		this.map.reset()
		this.map.draw(this.ctx)
		this.startLevel()
	}

	loseLife() {
		this.setState(WAITING)
		this.player.loseLife()
		if (this.player.getLives() > 0) {
			this.startLevel()
		}
	}

	setState(nState) {
		this.state = nState
		this.stateChanged = true
	}

	collided(user, ghost) {
		return (Math.sqrt(Math.pow(ghost.x - user.x, 2) + 
						  Math.pow(ghost.y - user.y, 2))) < 10
	}

	updateStats() {
		this.dom.score.textContent = this.player.theScore()
		this.dom.lives.textContent = this.player.getLives() // TODO: Draw little pacman faces for the lives here
		this.dom.level.textContent = this.level
		this.dom.sound.classList.toggle("disabled", this.soundDisabled())
	}

	redrawBlock(pos) {
		this.map.drawBlock(Math.floor(pos.y/10), Math.floor(pos.x/10), this.ctx)
		this.map.drawBlock(Math.ceil(pos.y/10), Math.ceil(pos.x/10), this.ctx)
	}

	mainDraw() {
		this.ghostPos = []

		for (let i = 0; i < this.ghosts.length; i++) {
			this.ghostPos.push(this.ghosts[i].move(this.ctx))
		}
		const u = this.player.move(this.ctx)
		
		for (let i = 0; i < this.ghosts.length; i++) {
			this.redrawBlock(this.ghostPos[i].old)
		}
		this.redrawBlock(u.old)
		
		for (let i = 0; i < this.ghosts.length; i++) {
			this.ghosts[i].draw(this.ctx)
		}
		this.player.draw(this.ctx)
		
		this.userPos = u["new"]
		
		for (let i = 0; i < this.ghosts.length; i++) {
			if (this.collided(this.userPos, this.ghostPos[i]["new"])) {
				if (this.ghosts[i].isVunerable()) {
					this.audio.play("eatghost")
					this.ghosts[i].eat()
					this.eatenCount += 1
					const nScore = this.eatenCount * 50
					this.player.addScore(nScore)
					this.updateStats()
					this.setState(EATEN_PAUSE)
					this.timerStart = this.tick
				} else if (this.ghosts[i].isDangerous()) {
					this.audio.play("die")
					this.setState(DYING)
					this.timerStart = this.tick
				}
			}
		}
	}

	mainLoop() {
		++this.tick

		this.map.drawPills(this.ctx)

		if (this.state === PLAYING) {
			this.mainDraw()
		} else if (this.state === WAITING && this.stateChanged) {
			this.stateChanged = false
			this.map.draw(this.ctx)

			// Go again automatically!
			this.startNewGame()
		} else if (this.state === EATEN_PAUSE && 
				   (this.tick - this.timerStart) > (Pacman.FPS / 3)) {
			this.map.draw(this.ctx)
			this.setState(PLAYING)
		} else if (this.state === DYING) {
			if (this.tick - this.timerStart > (Pacman.FPS * 2)) {
				this.loseLife()
			} else {
				this.redrawBlock(this.userPos)
				for (let i = 0; i < this.ghosts.length; i++) {
					this.redrawBlock(this.ghostPos[i].old)
					this.ghosts[i].draw(this.ctx)
				}
				this.player.drawDead(this.ctx, (this.tick - this.timerStart) / (Pacman.FPS * 2))
			}
		} else if (this.state === COUNTDOWN) {
			const diff = 4 + Math.floor((this.timerStart - this.tick) / Pacman.FPS)
			
			if (diff === 0) {
				this.map.draw(this.ctx)
				this.setState(PLAYING)
				this.dialog("")
			} else {
				if (diff !== this.lastTime) {
					this.lastTime = diff
					this.map.draw(this.ctx)
					if(this.player.startingLives == this.player.getLives()){
						this.dialog(`New game starting in ${diff}...`)
					}else{
						this.dialog(`Restarting in ${diff}...`)
					}
				}
			}
		}

		this.updateStats()
	}

	eatenPill() {
		this.audio.play("eatpill")
		this.timerStart = this.tick
		this.eatenCount = 0
		for (let i = 0; i < this.ghosts.length; i++) {
			this.ghosts[i].makeEatable(this.ctx)
		}
	}

	completedLevel() {
		this.setState(WAITING)
		this.level += 1
		this.map.reset()
		this.player.newLevel()
		this.startLevel()
	}
}