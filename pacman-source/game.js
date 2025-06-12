class Game {
	constructor(wrapper) {
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
		
		// Setup
		this.wrapper = wrapper
		this.init()
	}

	getTick() {
		return this.tick
	}

	init() {
		const blockSize = this.wrapper.offsetWidth / 19
		const canvas = document.createElement("canvas")
		
		// Calculate actual canvas size
		const canvasWidth = blockSize * 19
		const canvasHeight = blockSize * 22 + 30
		
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

		this.loadAudio()
	}

	async loadAudio() {
		const audioFiles = [
			["start", "audio/opening_song.mp3"],
			["die", "audio/die.mp3"],
			["eatghost", "audio/eatghost.mp3"],
			["eatpill", "audio/eatpill.mp3"],
			["eating", "audio/eating.short.mp3"],
			["eating2", "audio/eating.short.mp3"]
		]

		try {
			await Promise.all(
				audioFiles.map(([name, path]) => this.audio.loadSound(name, path))
			)
		} catch (error) {
			console.log('Some audio files failed to load:', error)
		}

		this.loaded()
	}

	loaded() {
		this.dialog("Press N to Start")
		
		document.addEventListener("keydown", (e) => this.keyDown(e), true)
		document.addEventListener("keypress", (e) => this.keyPress(e), true)
		
		this.startMainLoop()
	}

	startMainLoop() {
		setInterval(() => this.mainLoop(), 1000 / Pacman.FPS)
	}

	dialog(text) {
		this.ctx.fillStyle = "#FFFF00"
		this.ctx.font = Math.floor(this.map.blockSize * 0.7) + "px Arial"
		const width = this.ctx.measureText(text).width
		const x = ((this.map.width * this.map.blockSize) - width) / 2
		this.ctx.fillText(text, x, (this.map.height * 10) + 8)
	}

	drawScore(text, position) {
		this.ctx.fillStyle = "#FFFFFF"
		this.ctx.font = Math.floor(this.map.blockSize * 0.6) + "px Arial"
		this.ctx.fillText(text, 
			(position["new"]["x"] / 10) * this.map.blockSize, 
			((position["new"]["y"] + 5) / 10) * this.map.blockSize)
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

	keyDown(e) {
		if (e.key === 'n' || e.key === 'N') {
			this.startNewGame()
		} else if (e.key === 's' || e.key === 'S') {
			this.audio.toggleSound()
		} else if ((e.key === 'p' || e.key === 'P') && this.state === PAUSE) {
			this.audio.resume()
			this.map.draw(this.ctx)
			this.setState(this.stored)
		} else if (e.key === 'p' || e.key === 'P') {
			this.stored = this.state
			this.setState(PAUSE)
			this.audio.pause()
			this.map.draw(this.ctx)
			this.dialog("Paused")
		} else if (this.state !== PAUSE) {
			return this.player.keyDown(e)
		}
		return true
	}

	keyPress(e) {
		if (this.state !== WAITING && this.state !== PAUSE) {
			e.preventDefault()
			e.stopPropagation()
		}
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

	drawFooter() {
		const topLeft = (this.map.height * this.map.blockSize)
		const textBase = topLeft + Math.floor(this.map.blockSize * 0.8)
		const blockSize = this.map.blockSize
		
		this.ctx.fillStyle = "#000000"
		this.ctx.fillRect(0, topLeft, (this.map.width * this.map.blockSize), 30)
		
		this.ctx.fillStyle = "#FFFF00"

		// Draw lives with proper scaling
		for (let i = 0, len = this.player.getLives(); i < len; i++) {
			this.ctx.fillStyle = "#FFFF00"
			this.ctx.beginPath()
			const lifeX = 150 + (25 * i) + blockSize / 2
			const lifeY = (topLeft + 1) + blockSize / 2
			
			this.ctx.moveTo(lifeX, lifeY)
			this.ctx.arc(lifeX, lifeY, blockSize / 2, Math.PI * 0.25, Math.PI * 1.75, false)
			this.ctx.fill()
		}

		// Sound indicator with proper scaling
		this.ctx.fillStyle = !this.soundDisabled() ? "#00FF00" : "#FF0000"
		this.ctx.font = "bold " + Math.floor(blockSize * 0.8) + "px sans-serif"
		this.ctx.fillText("♪", 10, textBase)

		// Score and level with proper scaling
		this.ctx.fillStyle = "#FFFF00"
		this.ctx.font = Math.floor(blockSize * 0.7) + "px Arial"
		this.ctx.fillText("Score: " + this.player.theScore(), 30, textBase)
		this.ctx.fillText("Level: " + this.level, this.map.width * blockSize - 100, textBase)
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
					this.drawScore(nScore.toString(), this.ghostPos[i])
					this.player.addScore(nScore)
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
		if (this.state !== PAUSE) {
			++this.tick
		}

		this.map.drawPills(this.ctx)

		if (this.state === PLAYING) {
			this.mainDraw()
		} else if (this.state === WAITING && this.stateChanged) {
			this.stateChanged = false
			this.map.draw(this.ctx)
			this.dialog("Press N to start a New game")
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
			const diff = 5 + Math.floor((this.timerStart - this.tick) / Pacman.FPS)
			
			if (diff === 0) {
				this.map.draw(this.ctx)
				this.setState(PLAYING)
			} else {
				if (diff !== this.lastTime) {
					this.lastTime = diff
					this.map.draw(this.ctx)
					this.dialog("Starting in: " + diff)
				}
			}
		}

		this.drawFooter()
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