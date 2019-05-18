import p5, { Vector } from 'p5'
import { NeuralNetwork } from './nnn'
import * as tf from '@tensorflow/tfjs'

export class Snake {
	private readonly MUTATION_RATE = 0.1

	private x = 0
	private y = 0
	private xspeed = 1
	private yspeed = 0
	public total = 0
	private tail: Vector[] = []
	private hasDired = false
	private lastDistToFood = -1
	public score = 0
	public brain: NeuralNetwork
	private food!: Vector
	public dead = false
	public fitness = -1

	constructor(
		private p: p5,
		private readonly scl: number,
		brain?: NeuralNetwork | tf.Sequential
	) {
		this.pickLocation()
		if (!brain) {
			this.brain = new NeuralNetwork(2704, 80, 3)
		} else {
			if (brain instanceof NeuralNetwork) {
				this.brain = brain.copy()
			} else {
				this.brain = new NeuralNetwork(brain, 2704, 80, 3)
			}
		}
	}

	public eat() {
		var d = this.p.dist(this.x, this.y, this.food.x, this.food.y)
		if (d < 1) {
			this.total++
			this.score += 50
			this.lastDistToFood = -1
			this.pickLocation()
			return true
		} else {
			return false
		}
	}

	public mutate() {
		this.brain.mutate(this.MUTATION_RATE)
	}

	public dispose() {
		this.brain.dispose()
	}

	public dir(x: number, y: number) {
		if (this.hasDired) {
			return
		}
		if ((this.xspeed <= 0 && x <= 0) || (this.xspeed >= 0 && x >= 0)) {
			this.xspeed = x
		}
		if ((this.yspeed <= 0 && y <= 0) || (this.yspeed >= 0 && y >= 0)) {
			this.yspeed = y
		}
		this.hasDired = true
	}

	public death() {
		if (this.dead) {
			return true
		}
		if (this.score < 0) {
			this.dead = true
			return true
		}
		for (var i = 0; i < this.tail.length; i++) {
			var pos = this.tail[i]
			if (!pos) {
				continue
			}
			var d = this.p.dist(this.x, this.y, pos.x, pos.y)
			if (d < 1) {
				this.total = 0
				this.tail = []
				// this.score -= 10
				this.dead = true
				return true
			}
		}

		return false
	}

	public think() {
		// const inputs = [
		// 	Number(!this.isItClearStraightAhead()),
		// 	Number(!this.isItClearLeft()),
		// 	Number(!this.isItClearRight()),
		// 	Number(this.isFoodStraightAhead()),
		// 	Number(this.isFoodLeft()),
		// 	Number(this.isFoodRight()),
		// 	// this.foodDirectionX(),
		// 	// this.foodDirectionY(),
		// 	// this.p.map(this.food.x, 0, this.p.width, 0, 1),
		// 	// this.p.map(this.food.y, 0, this.p.height, 0, 1),
		// 	// this.p.map(this.x, 0, this.p.width, 0, 1),
		// 	// this.p.map(this.y, 0, this.p.height, 0, 1),
		// ]

		const inputs = this.getInputs()
		inputs.push(this.p.map(this.x, 0, this.p.width, 0, 1))
		inputs.push(this.p.map(this.y, 0, this.p.height, 0, 1))
		inputs.push(this.p.map(this.xspeed, -1, 1, 0, 1))
		inputs.push(this.p.map(this.xspeed, -1, 1, 0, 1))

		const output = this.brain.predict(inputs)

		let preference
		let largestNum = -Infinity
		for (let i = 0; i < output.length; ++i) {
			if (output[i] > largestNum) {
				largestNum = output[i]
				preference = i
			}
		}

		if (preference === 0) {
			// Forward
		} else if (preference === 1) {
			// Left
			if (this.yspeed < 0) {
				// Going up
				this.dir(-1, 0)
			} else if (this.yspeed > 0) {
				this.dir(1, 0)
			} else if (this.xspeed < 0) {
				this.dir(0, 1)
			} else if (this.xspeed > 0) {
				this.dir(0, -1)
			}
		} else if (preference === 2) {
			// Go right
			if (this.yspeed < 0) {
				// Going up
				this.dir(1, 0)
			} else if (this.yspeed > 0) {
				this.dir(-1, 0)
			} else if (this.xspeed < 0) {
				this.dir(0, -1)
			} else if (this.xspeed > 0) {
				this.dir(0, 1)
			}
		}
	}

	public update() {
		if (this.dead) {
			return
		}

		for (var i = 0; i < this.tail.length - 1; i++) {
			this.tail[i] = this.tail[i + 1]
		}
		if (this.total >= 1) {
			this.tail[this.total - 1] = this.p.createVector(this.x, this.y)
		}

		this.x = this.x + this.xspeed * this.scl
		this.y = this.y + this.yspeed * this.scl

		this.x = this.p.constrain(this.x, 0, this.p.width - this.scl)
		this.y = this.p.constrain(this.y, 0, this.p.height - this.scl)

		this.hasDired = false
	}

	public show() {
		if (this.dead) {
			this.p.fill(0, 0, 200)
			this.p.rect(this.x, this.y, this.scl, this.scl)
			return
		}
		this.p.fill(255, 200)
		for (var i = 0; i < this.tail.length; i++) {
			this.p.rect(this.tail[i].x, this.tail[i].y, this.scl, this.scl)
		}
		this.p.fill(255)
		this.p.rect(this.x, this.y, this.scl, this.scl)

		// Food
		this.p.fill(255, 0, 50)
		this.p.rect(this.food.x, this.food.y, this.scl, this.scl)
	}

	private pickLocation() {
		var cols = this.p.floor(this.p.width / this.scl)
		var rows = this.p.floor(this.p.height / this.scl) - 1
		this.food = this.p.createVector(
			this.p.floor(this.p.random(cols)),
			this.p.floor(this.p.random(rows))
		)
		this.food.mult(this.scl).add(0, this.scl)
	}

	private isClear(nextPosX: number, nextPosY: number, label: string) {
		// Is going out of map
		if (nextPosX < 0 || nextPosX > this.p.width - this.scl) {
			return false
		}
		if (nextPosY < 0 || nextPosY > this.p.height - this.scl) {
			return false
		}

		// Is hitting tail
		if (
			this.tail.some(t => this.p.dist(nextPosX, nextPosY, t.x, t.y) < 1)
		) {
			return false
		}

		return true
	}

	private nextForwardPos(): [number, number] {
		const nextPosX = this.x + this.xspeed * this.scl
		const nextPosY = this.y + this.yspeed * this.scl
		return [nextPosX, nextPosY]
	}

	private nextLeftPos(): [number, number] {
		// Get next direction pos
		let nextPosX = this.x
		let nextPosY = this.y

		if (this.yspeed < 0) {
			// Up
			nextPosX = this.x - 1 * this.scl
		} else if (this.yspeed > 0) {
			// Down
			nextPosX = this.x + 1 * this.scl
		}

		if (this.xspeed > 0) {
			// Right
			nextPosY = this.y - 1 * this.scl
		} else if (this.xspeed < 0) {
			// Left
			nextPosY = this.y + 1 * this.scl
		}

		return [nextPosX, nextPosY]
	}

	private nextRightPos(): [number, number] {
		// Get next direction pos
		let nextPosX = this.x
		let nextPosY = this.y

		if (this.yspeed < 0) {
			// Up
			nextPosX = this.x + 1 * this.scl
		} else if (this.yspeed > 0) {
			// Down
			nextPosX = this.x - 1 * this.scl
		}

		if (this.xspeed > 0) {
			// Right
			nextPosY = this.y + 1 * this.scl
		} else if (this.xspeed < 0) {
			// Left
			nextPosY = this.y - 1 * this.scl
		}

		return [nextPosX, nextPosY]
	}

	// Neural network
	public isItClearStraightAhead() {
		const [nextPosX, nextPosY] = this.nextForwardPos()
		return this.isClear(nextPosX, nextPosY, 'FORWARD')
	}

	public isItClearLeft() {
		const [nextPosX, nextPosY] = this.nextLeftPos()
		return this.isClear(nextPosX, nextPosY, 'LEFT')
	}

	public isItClearRight() {
		const [nextPosX, nextPosY] = this.nextRightPos()
		return this.isClear(nextPosX, nextPosY, 'RIGHT')
	}

	public foodDirectionX() {
		if (this.food.x < this.x) {
			return -1
		} else if (this.food.x > this.x) {
			return 1
		} else {
			return 0
		}
	}

	public foodDirectionY() {
		if (this.food.y < this.y) {
			return -1
		} else if (this.food.y > this.y) {
			return 1
		} else {
			return 0
		}
	}

	public isFoodStraightAhead() {
		// const [nextPosX, nextPosY] = this.nextForwardPos()
		// return this.p.dist(nextPosX, nextPosY, this.food.x, this.food.y) < 1

		if (this.xspeed > 0 && this.y === this.food.y && this.food.x > this.x) {
			// Moving right
			return true
		} else if (
			this.xspeed < 0 &&
			this.y === this.food.y &&
			this.food.x < this.x
		) {
			return true
		} else if (
			this.yspeed > 0 &&
			this.x === this.food.x &&
			this.food.y > this.y
		) {
			return true
		} else if (
			this.yspeed < 0 &&
			this.x === this.food.x &&
			this.food.y < this.y
		) {
			return true
		}
		return false
	}

	public isFoodLeft() {
		if (this.xspeed > 0 && this.food.y < this.y) {
			return this.food.x === this.x
		} else if (this.xspeed < 0 && this.food.y > this.y) {
			return this.food.x === this.x
		} else if (this.yspeed > 0 && this.food.x > this.x) {
			return this.food.y === this.y
		} else if (this.yspeed < 0 && this.food.x < this.x) {
			return this.food.y === this.y
		}
		return false
	}

	public isFoodRight() {
		if (this.xspeed > 0 && this.food.y > this.y) {
			return this.food.x === this.x
		} else if (this.xspeed < 0 && this.food.y < this.y) {
			return this.food.x === this.x
		} else if (this.yspeed > 0 && this.food.x < this.x) {
			return this.food.y === this.y
		} else if (this.yspeed < 0 && this.food.x > this.x) {
			return this.food.y === this.y
		}
		return false
	}

	public calculateScore() {
		if (this.dead) {
			return this.score
		}

		const newDistance = this.p.dist(
			this.x,
			this.y,
			this.food.x,
			this.food.y
		)

		if (this.lastDistToFood === -1) {
			this.lastDistToFood = newDistance
			return this.score
		}

		if (newDistance < this.lastDistToFood) {
			this.score++
		} else {
			this.score -= 2
		}

		this.lastDistToFood = newDistance
		return this.score
	}

	public getInputs() {
		// Loop over all cells
		let inputs = []
		for (let y = 0; y < this.p.height / this.scl; ++y) {
			for (let x = 0; x < this.p.width / this.scl; ++x) {
				const posX = x * this.scl
				const posY = y * this.scl
				const headIsHere = this.x === posX && this.y === posY
				const tailIsHere = this.tail.some(
					tail => tail.x === posX && tail.y === posY
				)
				const foodIsHere = this.food.x === posX && this.food.y === posY
				inputs.push(
					Number(headIsHere),
					Number(tailIsHere),
					Number(foodIsHere)
				)
			}
		}
		return inputs
	}
}
