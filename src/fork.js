const path = require('path')
const childProcess = require('child_process')
const nosync = require('async')

class Fork {
  constructor(module, events) {
    this.module = module
    this.events = events
    this.p = null
    // task == msg
    this.q = nosync.queue(async (task, done) => {
      console.log(`msg: ${JSON.stringify(task)}`)

      const result = await this.send(task)
      console.log(`task-result: ${JSON.stringify(result)}`)

      // task.callback(result);
      task.resolve(result)

      done(result)
    }, 1)
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
    return new Promise((resolve) => {
      msg.resolve = resolve
      this.q.push(msg)
    })
  }

  async send(msg) {
    return new Promise((resolve) => {
      this.p.once('message', (res) => {
        resolve(res)
      })
      this.p.send(msg)
    })
  }

  makeChild() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.module) {
          throw Error('requires module member')
        }

        const child = childProcess.fork(`./${this.module}`, [], {
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
        // child.on('message', (res) => {
        child.on('message', () => {
          // you can understand that setted child-callback executes consecutively
          // console.log(`logger: ${res}, ${JSON.stringify(res)}`);
        })

        resolve(child)
      } catch (err) {
        reject(err)
      }
    })
  }
}

module.exports = Fork

// シングルトンの処理に複数の処理をコールした時に、複数のリクエストが同時に来たとしても、一番最初に処理が終わった物が戻り値として帰ってくる