import * as tf from '@tensorflow/tfjs'

// // Define a model for linear regression.
// const model = tf.sequential()
// const hidden = tf.layers.dense({
// 	units: 8, // Hidden nodes
// 	inputShape: [6],
// 	activation: 'sigmoid',
// })
// model.add(hidden)

// const output = tf.layers.dense({
// 	units: 3,
// 	activation: 'sigmoid',
// })
// model.add(output)

// // Prepare the model for training: Specify the loss and the optimizer.
// model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' })

// // Generate some synthetic data for training.
// const xs = tf.tensor2d([1, 2, 3, 4], [4, 1])
// const ys = tf.tensor2d([1, 3, 5, 7], [4, 1])

// model.fit

// // Train the model using the data.
// model.fit(xs, ys).then(() => {
// 	// Use the model to do inference on a data point the model hasn't seen before:
// 	console.log(model.predict(tf.tensor2d([5], [1, 1])).toString())
// })
