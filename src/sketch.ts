import p5 from 'p5'
import { Snake } from './snake'
import { NeuralNetwork } from './nnn'
import * as tf from '@tensorflow/tfjs'
import { nextGeneration } from './ga'

declare global {
	interface Window {
		LOAD_BRAINS: boolean
		SAVE_BRAINS: boolean
		GENERATION_LIFETIME: number
		GENERATION_MAX_UPDATES: number
		FRAME_RATE: number
		SHOW_ALL_SNAKES: boolean
		MODEL_SAVE_INTERVAL: number
	}
}

window.LOAD_BRAINS = true
window.SAVE_BRAINS = true

window.GENERATION_LIFETIME = Infinity
window.GENERATION_MAX_UPDATES = 200
window.FRAME_RATE = 500
window.SHOW_ALL_SNAKES = false
window.MODEL_SAVE_INTERVAL = 60000
const SAVE_PREFIX = ''
const POPULATION = 55
const scl = 20
let speed = 1
let lastGenerationStart = 0
let lastModelSave = 0
let currentUpdateCount = 0
let clearLocalStorageEl!: HTMLDivElement

const loadedBrains: (tf.Sequential | undefined)[] = []

let snakes: Snake[] = []
// let food: Vector

// const pickLocation = (p: p5) => {
// 	var cols = p.floor(p.width / scl)
// 	var rows = p.floor(p.height / scl)
// 	food = p.createVector(p.floor(p.random(cols)), p.floor(p.random(rows)))
// 	food.mult(scl)
// }
let generation = 0
let highScoreEver = 0

const generationEl = document.getElementById(
	'generation'
) as HTMLParagraphElement
const aliveEl = document.getElementById('alive') as HTMLParagraphElement
const highScoreTotalEl = document.getElementById(
	'high-score-total'
) as HTMLParagraphElement
const highScoreGenerationEl = document.getElementById(
	'high-score-generation'
) as HTMLParagraphElement

const setup = (p: p5) => () => {
	tf.setBackend('cpu')
	p.createCanvas(600, 600)
	for (let i = 0; i < POPULATION; ++i) {
		snakes.push(new Snake(p, scl, loadedBrains[i]))
	}
	p.frameRate(window.FRAME_RATE)
	lastGenerationStart = +new Date()
	lastModelSave = +new Date()
	document.body.appendChild(clearLocalStorageEl)
}

// const mousePressed = () => {
// 	snakes.total++
// }

const draw = (p: p5) => () => {
	p.frameRate(window.FRAME_RATE)
	p.background(51)

	let currentlyAlive = 0
	let largestScore = 0

	if (p.frameCount % speed === 0 || p.frameCount === 1) {
		currentUpdateCount++
		// if (snake.eat(food)) {
		// 	pickLocation(p)
		// }
		snakes.forEach(snake => snake.update())
		snakes.forEach(snake => {
			if (!snake.death()) {
				currentlyAlive++
			}
		})

		snakes.forEach(snake => snake.eat())
		snakes.forEach(snake => {
			const score = snake.calculateScore()
			if (score > largestScore) {
				largestScore = score
			}
		})
		snakes.forEach(snake => snake.think())

		// snake.calculateScore(food)
		// console.log(snake.score)

		// snake.isItClearStraightAhead()
		// snake.isItClearLeft()

		// console.log(snakes[0].score)

		// switch (true) {
		// 	case p.keyIsDown(38):
		// 		snakes[0].dir(0, -1)
		// 		break

		// 	case p.keyIsDown(40):
		// 		snakes[0].dir(0, 1)
		// 		break

		// 	case p.keyIsDown(39):
		// 		snakes[0].dir(1, 0)
		// 		break

		// 	case p.keyIsDown(37):
		// 		snakes[0].dir(-1, 0)
		// 		break
		// }
	}

	if (largestScore > highScoreEver) {
		highScoreEver = largestScore
	}

	aliveEl.textContent = `${currentlyAlive}/${POPULATION}`
	highScoreTotalEl.textContent = highScoreEver.toString()
	highScoreGenerationEl.textContent = largestScore.toString()

	if (window.SHOW_ALL_SNAKES) {
		snakes.forEach(snake => snake.show())
	} else {
		const bestSnake = snakes.reduce<Snake | null>((acc, snake) => {
			if (!acc) {
				return snake
			}

			if (snake.score > acc.score && !snake.dead) {
				return snake
			}

			return acc
		}, null)
		if (bestSnake) {
			bestSnake.show()
		}
	}

	if (
		currentUpdateCount > window.GENERATION_MAX_UPDATES ||
		+new Date() - lastGenerationStart > window.GENERATION_LIFETIME ||
		currentlyAlive === 0
	) {
		currentUpdateCount = 0
		lastGenerationStart = +new Date()
		let { snakes: newSnakes, generation: newGeneration } = nextGeneration(
			snakes,
			p,
			scl
		)
		snakes = newSnakes
		generation = newGeneration
		generationEl.textContent = generation.toString()

		if (
			window.SAVE_BRAINS &&
			+new Date() - lastModelSave > window.MODEL_SAVE_INTERVAL
		) {
			lastModelSave = +new Date()
			console.log('Saving models')
			snakes.forEach((snake, index) =>
				snake.brain.save(`snake${SAVE_PREFIX}--${index}`)
			)
		}
	}

	// p.fill(255, 0, 100)
	// p.rect(food.x, food.y, scl, scl)
}

const keyPressed = (p: p5) => () => {
	if (p.keyCode === 32) {
		// Space bar
		if (speed === 4) {
			speed = 24
		} else {
			speed = 4
		}
	}
}

const sketch = (p: p5) => {
	p.setup = setup(p)
	// p.mousePressed = mousePressed
	p.draw = draw(p)
	p.keyPressed = keyPressed(p)
}

if (window.LOAD_BRAINS) {
	const promises = []
	for (let i = 0; i < POPULATION; ++i) {
		loadedBrains.push(undefined)

		const res = NeuralNetwork.load(`snake${SAVE_PREFIX}--${i}`)
			.then(brain => {
				if (brain) {
					console.log('Loaded brain')
					loadedBrains[i] = brain as tf.Sequential
				}
			})
			.catch(_ => {
				console.log('No brain found')
			})
		promises.push(res)
	}
	Promise.all(promises).then(() => {
		new p5(sketch)
	})
} else {
	new p5(sketch)
}

clearLocalStorageEl = document.createElement('div')
clearLocalStorageEl.classList.add('clear-local-storage')
clearLocalStorageEl.textContent = 'Delete saved snake data'
clearLocalStorageEl.addEventListener('click', () => {
	localStorage.clear()
})
