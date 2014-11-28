/**
 *
 * The Bipio Facebook Pod.  Facebook Actions and Content Emitters
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2014 CloudSpark pty ltd http://www.cloudspark.com.au
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
var Pod = require('bip-pod'),
    FB = require('fb'),
    crypto = require('crypto'),
    async   = require('async'),
    Facebook = new Pod({});

Facebook.initParams = function(sysImports) {
  var config = this.getConfig(),
    hmac = crypto.createHmac('sha256', sysImports.auth.oauth.clientSecret || config.oauth.clientSecret);

  hmac.update(sysImports.auth.oauth.token);
  var params = {};

  params.access_token = sysImports.auth.oauth.token;
  params.appsecret_proof = hmac.digest('hex');

  return params;
}

Facebook.getClient = function() {
  return FB;
}

Facebook.rpc = function(action, method, sysImports, options, channel, req, res) {
  if (method == 'my_pages') {
    var args = initParams(sysImports),
      client = this.getClient();

    client.api(
      '/me/accounts',
      'get',
      args,
      function (response) {
        if (response.error) {
          res.send(response.error);
        } else {
          var pageReq = [];
          for (var i = 0; i < response.data.length; i++) {
            pageReq.push(
              function(pageId) {
                return function(next) {
                  return client.api('/' + pageId, 'get', args, function(result) {
                    next(false, result);
                  });
                }
              }(response.data[i].id) // self exec
              );
          }

          async.parallel(pageReq, function(results) {
            var resp;
            for (var key in arguments) {
              if (arguments.hasOwnProperty(key) && arguments[key] ) {
                resp = arguments[key];
              }
            }
            res.send(resp);
          });
        }
      }
      );
  } else {
    this.__proto__.rpc.apply(this, arguments);
  }
}

// -----------------------------------------------------------------------------
module.exports = Facebook;
