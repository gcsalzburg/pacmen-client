class GameMap {
    constructor(size) {
        this.height = null
        this.width = null
        this.blockSize = size
        this.pillSize = 0
        this.map = null
        this.reset()
    }

    withinBounds(y, x) {
        return y >= 0 && y < this.height && x >= 0 && x < this.width
    }
    
    isWallSpace(pos) {
        return this.withinBounds(pos.y, pos.x) && this.map[pos.y][pos.x] === Pacman.WALL
    }
    
    isFloorSpace(pos) {
        if (!this.withinBounds(pos.y, pos.x)) {
            return false
        }
        var peice = this.map[pos.y][pos.x]
        return peice === Pacman.EMPTY || 
            peice === Pacman.BISCUIT ||
            peice === Pacman.PILL
    }
    
    drawWalls(ctx) {
        var i, j, p, line
        
        ctx.strokeStyle = "#0000FF"
        ctx.lineWidth = 5
        ctx.lineCap = "round"
        
        for (i = 0; i < Pacman.WALLS.length; i += 1) {
            line = Pacman.WALLS[i]
            ctx.beginPath()

            for (j = 0; j < line.length; j += 1) {
                p = line[j]
                
                if (p.move) {
                    ctx.moveTo(p.move[0] * this.blockSize, p.move[1] * this.blockSize)
                } else if (p.line) {
                    ctx.lineTo(p.line[0] * this.blockSize, p.line[1] * this.blockSize)
                } else if (p.curve) {
                    ctx.quadraticCurveTo(p.curve[0] * this.blockSize, 
                                         p.curve[1] * this.blockSize,
                                         p.curve[2] * this.blockSize, 
                                         p.curve[3] * this.blockSize)   
                }
            }
            ctx.stroke()
        }
    }
    
    reset() {       
		this.map = this.cloneArray ? this.cloneArray(Pacman.MAP) : JSON.parse(JSON.stringify(Pacman.MAP))
		this.height = this.map.length
		this.width = this.map[0].length         
    }

	 cloneArray(arr) {
		return arr.map(row => Array.isArray(row) ? this.cloneArray(row) : row)
	}

    block(pos) {
        return this.map[pos.y][pos.x]
    }
    
    setBlock(pos, type) {
        this.map[pos.y][pos.x] = type
    }

    drawPills(ctx) { 
        if (++this.pillSize > 30) {
            this.pillSize = 0
        }
        
        for (let i = 0; i < this.height; i += 1) {
            for (let j = 0; j < this.width; j += 1) {
                if (this.map[i][j] === Pacman.PILL) {
                    ctx.beginPath()

                    ctx.fillStyle = "#000"
                    ctx.fillRect((j * this.blockSize), (i * this.blockSize), 
                                 this.blockSize, this.blockSize)

                    ctx.fillStyle = "#FFF"
                    ctx.arc((j * this.blockSize) + this.blockSize / 2,
                            (i * this.blockSize) + this.blockSize / 2,
                            Math.abs(5 - (this.pillSize/3)), 
                            0, 
                            Math.PI * 2, false) 
                    ctx.fill()
                    ctx.closePath()
                }
            }
        }
    }
    
    draw(ctx) {
        var i, j, size = this.blockSize

        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, this.width * size, this.height * size)

        this.drawWalls(ctx)
        
        for (i = 0; i < this.height; i += 1) {
            for (j = 0; j < this.width; j += 1) {
                this.drawBlock(i, j, ctx)
            }
        }
    }
    
    drawBlock(y, x, ctx) {
        var layout = this.map[y][x]

        if (layout === Pacman.PILL) {
            return
        }

        ctx.beginPath()
        
        if (layout === Pacman.EMPTY || layout === Pacman.BLOCK || 
            layout === Pacman.BISCUIT) {
            
            ctx.fillStyle = "#000"
            ctx.fillRect((x * this.blockSize), (y * this.blockSize), 
                         this.blockSize, this.blockSize)

            if (layout === Pacman.BISCUIT) {
                ctx.fillStyle = "#FFF"
                ctx.fillRect((x * this.blockSize) + (this.blockSize / 2.5), 
                             (y * this.blockSize) + (this.blockSize / 2.5), 
                             this.blockSize / 6, this.blockSize / 6)
            }
        }
        ctx.closePath()	 
    }
}