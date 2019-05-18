import p5 from 'p5'
import { Snake } from './snake'
import { random } from './nnn'

let currentGeneration = 0

export function nextGeneration(snakes: Snake[], p: p5, scl: number) {
	currentGeneration++
	console.log(`Generation ${currentGeneration}`)
	calculateFitness(snakes)
	const newSnakes = snakes.map(() => pickOne(snakes, p, scl))
	snakes.forEach(snake => snake.dispose())
	return { snakes: newSnakes, generation: currentGeneration }
}

function pickOne(snakes: Snake[], p: p5, scl: number) {
	let index = 0
	let r = random(1)
	while (r > 0) {
		r = r - snakes[index].fitness
		index++
	}
	index--
	let bird = snakes[index]
	let child = new Snake(p, scl, bird.brain)
	child.mutate()
	return child
}

function calculateFitness(snakes: Snake[]) {
	let offset = snakes.reduce((acc, snake) => {
		if (snake.score < acc) {
			return snake.score
		}
		return acc
	}, Infinity)
	offset = Math.abs(offset)

	let sum = 0
	snakes.forEach(snake => void (sum += snake.score + offset))
	snakes.forEach(snake => {
		snake.fitness = (snake.score + offset) / sum
	})
}
