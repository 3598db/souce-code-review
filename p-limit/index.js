'use strict';
const pTry = require('p-try');

// const pTry = function (fn, ...arguments_) {
//   return new Promise(resolve => {
//     resolve(fn(...arguments_));
//   })
// };

const pLimit = concurrency => {
  // promise池大小边界情况处理
	if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
		return Promise.reject(new TypeError('Expected `concurrency` to be a number from 1 and up'));
	}

  // 队列
  // 使用了队列 所以这里的话是按顺序执行
  const queue = [];
  // 当前活跃对象 其实就是状态还处在pending状态的情况下的promise个数
	let activeCount = 0;

  // 当promise状态发生转换的时候执行的函数
  // 活跃对象减一 从队首删除一个元素并执行
	const next = () => {
		activeCount--;

		if (queue.length > 0) {
			queue.shift()();
		}
	};

  // 执行fn
  // 主要是创建了promise实例，并将结果resolve出去，同时通过then方法执行next函数
	const run = (fn, resolve, ...args) => {
		activeCount++;

		const result = pTry(fn, ...args);

		resolve(result);

		result.then(next, next);
	};

  // 入队
  // 如果当前活动对象未超过promise池限制 直接执行run方法创建promise
  // 如果当前活动对象超过promise池限制将会放入队列中
	const enqueue = (fn, resolve, ...args) => {
		if (activeCount < concurrency) {
			run(fn, resolve, ...args);
		} else {
			queue.push(run.bind(null, fn, resolve, ...args));
		}
	};

  // 生成器函数
  // promise化 generator生成的结果是promise对象，通过入队函数处理的同时传入的了resolve，可以接收回调执行结果
	const generator = (fn, ...args) => new Promise(resolve => enqueue(fn, resolve, ...args));
	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount
		},
		pendingCount: {
			get: () => queue.length
		},
		clearQueue: {
			value: () => {
				queue.length = 0;
			}
		}
	});

	return generator;
};

const limit = pLimit(2);

const input = [
	limit(() => fetchSomething('foo')),
	limit(() => fetchSomething('bar')),
	limit(() => doSomething())
];

(async () => {
	// Only one promise is run at once
	const result = await Promise.all(input);
	console.log(result);
})();


module.exports = pLimit;
module.exports.default = pLimit;
