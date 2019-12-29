export default (func) => {
  return new Promise((resolve, reject) => {
    func((err, data) => {
      if (err) {
        return reject(err)
      }
      return resolve(data)
    })
  })
}