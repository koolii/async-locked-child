const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

process.on('message', async (msg) => {
  if (msg.isLong) {
    await sleep(3000)
    process.send({ id: msg.id, sleep: 'long' })
  } else {
    await sleep(800)
    process.send({ id: msg.id, sleep: 'short' })
  }
})
