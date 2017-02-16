/**
 *
 * The Bipio Facebook Pod.  Facebook Actions and Content Emitters
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Pod = require('bip-pod'),
    FB = require('fb'),
    crypto = require('crypto'),
    async   = require('async'),
    Facebook = new Pod({});

Facebook.initParams = function(sysImports) {
  var config = this.getConfig(),
    hmac = crypto.createHmac('sha256',
      sysImports.auth.oauth.clientSecret
    );

  hmac.update(sysImports.auth.oauth.access_token);
  var params = {};

  params.access_token = sysImports.auth.oauth.access_token;
  params.appsecret_proof = hmac.digest('hex');

  return params;
}

Facebook.profileReprOAuth = function(profile) {
  return profile.name;
}

Facebook.getClient = function() {
  return FB;
}

Facebook.rpc = function(action, method, sysImports, options, channel, req, res) {
  if (method == 'my_pages') {
    var args = this.initParams(sysImports),
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
