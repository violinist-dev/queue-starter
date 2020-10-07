export default class fakeDockerode {
    run() {
        let promise = new Promise(function(resolve, reject) {
            resolve({
                output: {
                    StatusCode: 1
                }
            })
        })
        return promise
    }
}
