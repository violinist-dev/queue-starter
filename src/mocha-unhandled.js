let unhandledRejectionExitCode = 0

process.on('unhandledRejection', (reason) => {
  console.log('unhandled rejection:', reason)
  unhandledRejectionExitCode = 1
  throw reason
})

process.prependListener('exit', (code) => {
  if (code === 0) {
    process.exit(unhandledRejectionExitCode)
  }
})
