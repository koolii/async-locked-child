const Fork = require('./')

const main = async () => {
  // Fork instance
  const sleepCp = new Fork('example-child')
  const MAX = 10
  // make child-process
  await sleepCp.init()

  for (let i = 0; i < MAX; i += 1) {
    /* eslint-disable no-await-in-loop */
    const result = await sleepCp.request({ id: i + 1, value: Date.now(), isLong: i % 2 === 1 })
    console.log(JSON.stringify(result))
  }

  sleepCp.disconnect()
}

main()
