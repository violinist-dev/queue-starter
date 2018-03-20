const request = require('request')

module.exports = function(config) {
    return function(data, callback) {
        var headers = {
            'x-drupal-http-queue-token': config.token
        }
        var j = request.jar()
        var cookie = request.cookie('XDEBUG_SESSION=PHPSTORM')
        var baseUrl = config.baseUrl
        var url = baseUrl + '/cronner/queue'
        j.setCookie(cookie, baseUrl)
        request({
          url: config.baseUrl + '/http-queue/complete/' + data.job_id,
          jar: j,
          headers: headers,
          method: 'POST',
          body: data,
          json: true
        }, callback)
    }
}