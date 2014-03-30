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
    url = require('url'),
    async       = require('async'),
    Facebook = new Pod({
        name : 'facebook',
        description : 'Facebook',
        description_long : '<a href="https://www.facebook.com">Facebook</a> is a social networking website where users may create a personal profile, add other users as friends, and exchange messages, including automatic notifications when they update their profile.',
        authType : 'oauth',
        passportStrategy : require('passport-facebook').Strategy,
        config : {
            "oauth": {
                "clientID" : "",
                "clientSecret" : "",
                "scopes" : [
                    'email',
                    'user_about_me',
                    'publish_actions',
                    'read_stream',
                    'manage_pages'
                ]
            }
        },
        dataSources : [ require('./models/track_feed') ],
        'renderers' : {
          'my_pages' : {
            description : 'Get My Pages',
            contentType : DEFS.CONTENTTYPE_JSON,
            properties : {
              'id' : {
                type : "string",
                description: 'ID'
              },
              'name' : {
                type : "string",
                description: 'Name'
              }
            }
          }
        },
    },
    function() {
      var config = this.getConfig();
      FB.options({
        'appSecret': config.oauth.clientSecret,
        'appId' : config.oauth.clientID
      });
    });

Facebook.rpc = function(action, method, sysImports, options, channel, req, res) {
  if (method == 'my_pages') {
    (function(sysImports, res) {
      var args = {
        access_token : sysImports.auth.oauth.token
      };
      FB.api(
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
                    return FB.api('/' + pageId, 'get', args, function(result) {
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
    })(sysImports, res);
  } else {
    this.__proto__.rpc.apply(this, arguments);
  }
}


// attach smtp forwarder
Facebook.add(require('./post_timeline_mine.js'));
Facebook.add(require('./get_timeline_mine.js'));

Facebook.add(require('./post_page.js'));
Facebook.add(require('./post_page_photo.js'));
Facebook.add(require('./get_page_timeline.js'));

// -----------------------------------------------------------------------------
module.exports = Facebook;
