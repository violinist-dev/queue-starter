const request = require('request')

export default class Publisher {
  config
  constructor (config: {baseUrl}) {
    this.config = config
  }

  publish (data: {jobId: number}, callback: Function) {
    var headers = {
      'x-drupal-http-queue-token': this.config.token
    }
    var j = request.jar()
    var cookie = request.cookie('XDEBUG_SESSION=PHPSTORM')
    var baseUrl = this.config.baseUrl
    j.setCookie(cookie, baseUrl)
    request({
      url: this.config.baseUrl + '/http-queue/complete/' + data.jobId,
      jar: j,
      timeout: 15000,
      headers: headers,
      method: 'POST',
      body: data,
      json: true
    }, callback)
  }
}
