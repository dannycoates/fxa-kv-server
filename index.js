var config = require('./config')
var https = require('https')
var hapi = require('hapi')
var level = require('level')

var mozlog = require('mozlog')
mozlog.config({
  app: 'fxa-kv-server',
  level: config.log.level,
  fmt: config.log.fmt
})
var log = mozlog('kv')
log.verbose('config', config)

var oauthPool = new (require('poolee'))(
  https,
  [config.oauth.host + ':' + config.oauth.port],
  {
    keepAlive: true,
    ping: '/__heartbeat__'
  }
)

/*/
    Database configuration
/*/
var db = level(config.db.path)

function dbKey(key, credentials) {
  return credentials.user + '/' + credentials.client_id + '/' + key
}


/*/
    HTTP server configuration
/*/
var server = hapi.createServer(
  config.server.host,
  config.server.port,
  {
    cors: true,
    payload: {
      maxBytes: 256 * 1024
    },
    state: {
      cookies: {
        parse: false
      }
    }
  }
)

server.auth.scheme('oauth', function() {
  return {
    authenticate: function(req, next) {
      var auth = req.headers.authorization
      if (!auth || auth.indexOf('Bearer') !== 0) {
        return next(hapi.error.unauthorized('Bearer token not provided'))
      }
      var token = auth.split(' ')[1]
      oauthPool.request(
        {
          method: 'POST',
          path: '/v1/verify',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ token: token }),
        },
        function(err, resp, body) {
          if (err) {
            return next(hapi.error.serverTimeout(err.message))
          }
          try {
            var json = JSON.parse(body)
            if (json.code >= 400) {
              return next(hapi.error.unauthorized(json.message))
            }
            next(null, { credentials: json })
          }
          catch (e) {
            return next(hapi.error.serverTimeout(e.message))
          }
        }
      )
    }
  }
})
server.auth.strategy('oauth', 'oauth')

server.ext(
  'onPreResponse',
  function (request, next) {
    var status = request.response.statusCode || request.response.output.statusCode
    log.info('response', { method: request.method, path: request.path, status: status })
    next()
  }
)


server.route([
  {
    method: 'GET',
    path: '/v1/data/{key}',
    config: {
      auth: {
        strategy: 'oauth',
        scope: ['kv:read']
      }
    },
    handler: function (req, reply) {
      db.get(
        dbKey(req.params.key, req.auth.credentials),
        function (err, value) {
          if (err && err.notFound) {
            return reply(hapi.error.notFound())
          }
          reply(err || value)
        }
      )
    }
  },
  {
    method: 'PUT',
    path: '/v1/data/{key}',
    config: {
      auth: {
        strategy: 'oauth',
        scope: ['kv:write']
      },
      payload: {
        parse: 'gunzip'
      }
    },
    handler: function (req, reply) {
      db.put(dbKey(req.params.key, req.auth.credentials), req.payload, reply)
    }
  },
  {
    method: 'DELETE',
    path: '/v1/data/{key}',
    config: {
      auth: {
        strategy: 'oauth',
        scope: ['kv:write']
      }
    },
    handler: function (req, reply) {
      db.del(dbKey(key, req.auth.credentials), reply)
    }
  }
])

/*/
    Start your engines
/*/

db.once(
  'ready',
  function () {
    server.start()
  }
)

/*/
    ^C graceful shutdown
/*/

process.on(
  'SIGINT',
  function () {
    server.stop(
      function () {
        db.close(log.info.bind(log, 'shutdown'))
      }
    )
  }
)
