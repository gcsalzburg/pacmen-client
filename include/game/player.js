class Player {
    constructor(game, map) {
        this.game = game
        this.map = map
        
        this.position = null
        this.direction = null
        this.eaten = null
        this.due = null
        this.lives = null
        this.score = 5
        this.keyMap = {}

		  this.startingLives = 3
        
        this.setupKeyMapping()
        this.initUser()
    }

    setupKeyMapping() {
        this.keyMap["ArrowLeft"] = LEFT
        this.keyMap["ArrowUp"] = UP
        this.keyMap["ArrowRight"] = RIGHT
        this.keyMap["ArrowDown"] = DOWN
    }

    addScore(nScore) { 
        this.score += nScore
        if (this.score >= 10000 && this.score - nScore < 10000) { 
            this.lives += 1
        }
    }

    theScore() { 
        return this.score
    }

    loseLife() { 
        this.lives -= 1
    }

    getLives() {
        return this.lives
    }

    initUser() {
        this.score = 0
        this.lives = this.startingLives
        this.newLevel()
    }
    
    newLevel() {
        this.resetPosition()
        this.eaten = 0
    }
    
    resetPosition() {
        this.position = {"x": 90, "y": 120}
        this.direction = LEFT
        this.due = LEFT
    }
    
    reset() {
        this.initUser()
        this.resetPosition()
    }

    keyDown(e) {
        if (typeof this.keyMap[e.key] !== "undefined") { 
            this.due = this.keyMap[e.key]
            e.preventDefault()
            e.stopPropagation()
            return false
        }
        return true
    }

    getNewCoord(dir, current) {   
        return {
            "x": current.x + (dir === LEFT && -2 || dir === RIGHT && 2 || 0),
            "y": current.y + (dir === DOWN && 2 || dir === UP && -2 || 0)
        }
    }

    onWholeSquare(x) {
        return x % 10 === 0
    }

    pointToCoord(x) {
        return Math.round(x/10)
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

    next(pos, dir) {
        return {
            "y": this.pointToCoord(this.nextSquare(pos.y, dir)),
            "x": this.pointToCoord(this.nextSquare(pos.x, dir))
        }
    }

    onGridSquare(pos) {
        return this.onWholeSquare(pos.y) && this.onWholeSquare(pos.x)
    }

    isOnSamePlane(due, dir) { 
        return ((due === LEFT || due === RIGHT) && 
                (dir === LEFT || dir === RIGHT)) || 
            ((due === UP || due === DOWN) && 
             (dir === UP || dir === DOWN))
    }

    move(ctx) {
        var npos = null, 
            nextWhole = null, 
            oldPosition = this.position,
            block = null
        
        if (this.due !== this.direction) {
            npos = this.getNewCoord(this.due, this.position)
            
            if (this.isOnSamePlane(this.due, this.direction) || 
                (this.onGridSquare(this.position) && 
                 this.map.isFloorSpace(this.next(npos, this.due)))) {
                this.direction = this.due
            } else {
                npos = null
            }
        }

        if (npos === null) {
            npos = this.getNewCoord(this.direction, this.position)
        }
        
        if (this.onGridSquare(this.position) && this.map.isWallSpace(this.next(npos, this.direction))) {
            this.direction = NONE
        }

        if (this.direction === NONE) {
            return {"new": this.position, "old": this.position}
        }
        
        if (npos.y === 100 && npos.x >= 190 && this.direction === RIGHT) {
            npos = {"y": 100, "x": -10}
        }
        
        if (npos.y === 100 && npos.x <= -12 && this.direction === LEFT) {
            npos = {"y": 100, "x": 190}
        }
        
        this.position = npos        
        nextWhole = this.next(this.position, this.direction)
        
        block = this.map.block(nextWhole)        
        
        if ((this.isMidSquare(this.position.y) || this.isMidSquare(this.position.x)) &&
            (block === Pacman.BISCUIT || block === Pacman.PILL)) {
            
            this.map.setBlock(nextWhole, Pacman.EMPTY)           
            this.addScore((block === Pacman.BISCUIT) ? 10 : 50)
            this.eaten += 1
            
            if (this.eaten === 182) {
                this.game.completedLevel()
            }
            
            if (block === Pacman.PILL) { 
                this.game.eatenPill()
            }
        }   
                
        return {
            "new": this.position,
            "old": oldPosition
        }
    }

    isMidSquare(x) { 
        var rem = x % 10
        return rem > 3 || rem < 7
    }

    calcAngle(dir, pos) { 
        if (dir == RIGHT && (pos.x % 10 < 5)) {
            return {"start":0.25, "end":1.75, "direction": false}
        } else if (dir === DOWN && (pos.y % 10 < 5)) { 
            return {"start":0.75, "end":2.25, "direction": false}
        } else if (dir === UP && (pos.y % 10 < 5)) { 
            return {"start":1.25, "end":1.75, "direction": true}
        } else if (dir === LEFT && (pos.x % 10 < 5)) {             
            return {"start":0.75, "end":1.25, "direction": true}
        }
        return {"start":0, "end":2, "direction": false}
    }

    drawDead(ctx, amount) { 
        var size = this.map.blockSize, 
            half = size / 2

        if (amount >= 1) { 
            return
        }

        ctx.fillStyle = "#FFFF00"
        ctx.beginPath()        
        ctx.moveTo(((this.position.x/10) * size) + half, 
                   ((this.position.y/10) * size) + half)
        
        ctx.arc(((this.position.x/10) * size) + half, 
                ((this.position.y/10) * size) + half,
                half, 0, Math.PI * 2 * amount, true) 
        
        ctx.fill()    
    }

    draw(ctx) { 
        var s = this.map.blockSize, 
            angle = this.calcAngle(this.direction, this.position)

        ctx.fillStyle = "#FFFF00"

        ctx.beginPath()        

        ctx.moveTo(((this.position.x/10) * s) + s / 2,
                   ((this.position.y/10) * s) + s / 2)
        
        ctx.arc(((this.position.x/10) * s) + s / 2,
                ((this.position.y/10) * s) + s / 2,
                s / 2, Math.PI * angle.start, 
                Math.PI * angle.end, angle.direction) 
        
        ctx.fill()    
    }
}