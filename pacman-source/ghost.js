class Ghost {
	constructor(game, map, colour) {
		this.game = game
		this.map = map
		this.colour = colour
		
		this.position = null
		this.direction = null
		this.eatable = null
		this.eaten = null
		this.due = null
		
		this.reset()
	}

	getNewCoord(dir, current) { 
		var speed = this.isVunerable() ? 1 : this.isHidden() ? 4 : 2,
			xSpeed = (dir === LEFT && -speed || dir === RIGHT && speed || 0),
			ySpeed = (dir === DOWN && speed || dir === UP && -speed || 0)
	
		return {
			"x": this.addBounded(current.x, xSpeed),
			"y": this.addBounded(current.y, ySpeed)
		}
	}

	addBounded(x1, x2) { 
		var rem = x1 % 10, 
			result = rem + x2
		if (rem !== 0 && result > 10) {
			return x1 + (10 - rem)
		} else if(rem > 0 && result < 0) { 
			return x1 - rem
		}
		return x1 + x2
	}
	
	isVunerable() { 
		return this.eatable !== null
	}
	
	isDangerous() {
		return this.eaten === null
	}

	isHidden() { 
		return this.eatable === null && this.eaten !== null
	}
	
	getRandomDirection() {
		var moves = (this.direction === LEFT || this.direction === RIGHT) 
			? [UP, DOWN] : [LEFT, RIGHT]
		return moves[Math.floor(Math.random() * 2)]
	}
	
	reset() {
		this.eaten = null
		this.eatable = null
		this.position = {"x": 90, "y": 80}
		this.direction = this.getRandomDirection()
		this.due = this.getRandomDirection()
	}
	
	onWholeSquare(x) {
		return x % 10 === 0
	}
	
	oppositeDirection(dir) { 
		return dir === LEFT && RIGHT ||
			dir === RIGHT && LEFT ||
			dir === UP && DOWN || UP
	}

	makeEatable() {
		this.direction = this.oppositeDirection(this.direction)
		this.eatable = this.game.getTick()
	}

	eat() { 
		this.eatable = null
		this.eaten = this.game.getTick()
	}

	pointToCoord(x) {
		return Math.round(x / 10)
	}

	nextSquare(x, dir) {
		var rem = x % 10
		if (rem === 0) { 
			return x 
		} else if (dir === RIGHT || dir === DOWN) { 
			return x + (10 - rem)
		} else {
			return x - rem
		}
	}

	onGridSquare(pos) {
		return this.onWholeSquare(pos.y) && this.onWholeSquare(pos.x)
	}

	secondsAgo(tick) { 
		return (this.game.getTick() - tick) / Pacman.FPS
	}

	getColour() { 
		if (this.eatable) { 
			if (this.secondsAgo(this.eatable) > 5) { 
				return this.game.getTick() % 20 > 10 ? "#FFFFFF" : "#0000BB"
			} else { 
				return "#0000BB"
			}
		} else if(this.eaten) { 
			return "#222"
		} 
		return this.colour
	}

	draw(ctx) {
		var s = this.map.blockSize, 
			top = (this.position.y/10) * s,
			left = (this.position.x/10) * s
	
		if (this.eatable && this.secondsAgo(this.eatable) > 8) {
			this.eatable = null
		}
		
		if (this.eaten && this.secondsAgo(this.eaten) > 3) { 
			this.eaten = null
		}
		
		var tl = left + s
		var base = top + s - 3
		var inc = s / 10

		var high = this.game.getTick() % 10 > 5 ? 3  : -3
		var low  = this.game.getTick() % 10 > 5 ? -3 : 3

		ctx.fillStyle = this.getColour()
		ctx.beginPath()

		ctx.moveTo(left, base)

		ctx.quadraticCurveTo(left, top, left + (s/2),  top)
		ctx.quadraticCurveTo(left + s, top, left+s,  base)
		
		// Wavy things at the bottom
		ctx.quadraticCurveTo(tl-(inc*1), base+high, tl - (inc * 2),  base)
		ctx.quadraticCurveTo(tl-(inc*3), base+low, tl - (inc * 4),  base)
		ctx.quadraticCurveTo(tl-(inc*5), base+high, tl - (inc * 6),  base)
		ctx.quadraticCurveTo(tl-(inc*7), base+low, tl - (inc * 8),  base) 
		ctx.quadraticCurveTo(tl-(inc*9), base+high, tl - (inc * 10), base) 

		ctx.closePath()
		ctx.fill()

		ctx.beginPath()
		ctx.fillStyle = "#FFF"
		ctx.arc(left + 6,top + 6, s / 6, 0, 300, false)
		ctx.arc((left + s) - 6,top + 6, s / 6, 0, 300, false)
		ctx.closePath()
		ctx.fill()

		var f = s / 12
		var off = {}
		off[RIGHT] = [f, 0]
		off[LEFT]  = [-f, 0]
		off[UP]    = [0, -f]
		off[DOWN]  = [0, f]

		ctx.beginPath()
		ctx.fillStyle = "#000"
		ctx.arc(left+6+off[this.direction][0], top+6+off[this.direction][1], 
				s / 15, 0, 300, false)
		ctx.arc((left+s)-6+off[this.direction][0], top+6+off[this.direction][1], 
				s / 15, 0, 300, false)
		ctx.closePath()
		ctx.fill()
	}

	pane(pos) {
		if (pos.y === 100 && pos.x >= 190 && this.direction === RIGHT) {
			return {"y": 100, "x": -10}
		}
		
		if (pos.y === 100 && pos.x <= -10 && this.direction === LEFT) {
			return this.position = {"y": 100, "x": 190}
		}

		return false
	}
	
	move(ctx) {
		var oldPos = this.position,
			onGrid = this.onGridSquare(this.position),
			npos = null
		
		if (this.due !== this.direction) {
			npos = this.getNewCoord(this.due, this.position)
			
			if (onGrid &&
				this.map.isFloorSpace({
					"y": this.pointToCoord(this.nextSquare(npos.y, this.due)),
					"x": this.pointToCoord(this.nextSquare(npos.x, this.due))
				})) {
				this.direction = this.due
			} else {
				npos = null
			}
		}
		
		if (npos === null) {
			npos = this.getNewCoord(this.direction, this.position)
		}
		
		if (onGrid &&
			this.map.isWallSpace({
				"y": this.pointToCoord(this.nextSquare(npos.y, this.direction)),
				"x": this.pointToCoord(this.nextSquare(npos.x, this.direction))
			})) {
			
			this.due = this.getRandomDirection()            
			return this.move(ctx)
		}

		this.position = npos        
		
		var tmp = this.pane(this.position)
		if (tmp) { 
			this.position = tmp
		}
		
		this.due = this.getRandomDirection()
		
		return {
			"new": this.position,
			"old": oldPos
		}
	}
}