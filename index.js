const path = require('path')
const childProcess = require('child_process')
const nosync = require('async')

const countup = getCountUppper()
class Fork {
  constructor(filename, events) {
    this.filename = filename
    this.events = events
    this.p = null
    // task == msg
    this.q = nosync.queue(async (task, done) => {
      const result = await this.send(task)

      // task.callback(result);
      task.resolve(result)

      done(result)
    }, 1)
    this.resolvers = {}
  }

  async init() {
    this.p = await this.makeChild()

    if (this.events) {
      // set callbacks have already been defined in constructor
      Object.keys(this.events).forEach((key) => {
        this.p.on(key, this.events[key])
      })
    }
  }

  disconnect() {
    if (this.p) {
      this.p.disconnect()
    }
  }

  request(msg) {
    return new Promise((resolve, reject) => {
      const idx = countup()
      this.resolvers[idx] = resolve

      const result = await this.send(msg)
    })
  }

  async send(msg) {
    this.p.send(msg)
  }

  makeChild() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.filename) {
          throw Error('requires filename member')
        }

        const child = childProcess.fork(`./${this.filename}`, [], {
          cwd: path.resolve(__dirname),
        })

        if (!child.connected) {
          reject(new Error('Not Connected to child process'))
        }

        child.on('disconnect', () => {
          // ここで検証してみるのは良いかも。
          // ここで大量に待機しつづけ、メインでプロセスを終了させた時の挙動
          process.kill(child.pid)
        })

        // if this call returns anything, it doesn't occur anything
        child.on('message', ({res, idx}) => {
          const resolve = this.resolvers[idx]
          resolve(res)
        })

        resolve(child)
      } catch (err) {
        reject(err)
      }
    })
  }
}

function getCountUppper() {
  function* g() {
    let idx = 0
    while(true) {
      yield idx
      if (Number.MAX_SAFE_INTEGER === idx) {
        idx = 0
      } else {
        idx += 1
      }
    }
  }
  const generator = g()
  return () => generator.next().value
}

// シングルトンの処理に複数の処理をコールした時に、複数のリクエストが同時に来たとしても、一番最初に処理が終わった物が戻り値として帰ってくる
module.exports = Fork
