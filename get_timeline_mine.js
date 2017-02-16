/**
 *
 * The Bipio Facebook Pod.  get_timeline_mine action definition
 * ---------------------------------------------------------------
 *  Gets a users facebook timeline
 * ---------------------------------------------------------------
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
var url = require('url');

function GetTimelineMine() {}

GetTimelineMine.prototype = {};

GetTimelineMine.prototype.setup = function(channel, accountInfo, next) {
  this.pod.trackingStart(channel, accountInfo, true, next);
}

GetTimelineMine.prototype.teardown = function(channel, accountInfo, next) {
  this.pod.trackingRemove(channel, accountInfo, next);
}

GetTimelineMine.prototype.trigger = function(imports, channel, sysImports, contentParts, next) {
  var pod = this.pod,
    self = this;

  pod.trackingGet(channel, function(err, since) {
    if (err) {
      next(err);
    } else {
      pod.trackingUpdate(channel, function(err, until) {
        if (err) {
          next(err);
        } else {
          imports.since = since;
          imports.until = until;

          self.invoke(imports, channel, sysImports, contentParts, function(err, post) {
            if (err) {
              next(err);
            } else {
              next(false, post);
            }
          });
        }
      });
    }
  });
}

/**
 * Invokes (runs) the action.
 *
 */
GetTimelineMine.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
    var $resource = this.$resource,
      self = this,
      client = this.pod.getClient(sysImports);

    // get last tracking time
    var args = self.pod.initParams(sysImports);

    if (imports.since) {
        args.since = imports.since;
    }

    if (imports.until) {
        args.until = imports.until;
    }

    client.api(
    	'/v2.4/' + JSON.parse(sysImports.auth.oauth.profile).id  +'/feed',
        'get',
        args,
        function (res) {
            var exports = {};
            var err = false;
            var forwardOk = false;
            if (res.error) {
                next(res.error, exports);
                // expired token
                if (res.error.code == 190 && res.error.error_subcode == 466) {
                    // @todo disable all channels in this pod for this user, and
                    // generate a system notice for the user that their channels
                    // have been disabled
                    next(res.error.message);
                }
            } else {
                if (res.data.length > 0) {
                    var exports, r, justMe = (imports.me_only && $resource.helper.isTruthy(imports.me_only));
                    for (var i = 0; i < res.data.length; i++) {
                        r = res.data[i];
                        if (
                            (
                                justMe
                                && r.message
                                && r.message !== ''
                                && r.from.id === (sysImports.auth.oauth.user_id || JSON.parse(sysImports.auth.oauth.profile).id)
                            )
                             ||
                            !justMe) {

                            exports = {
                                id : r.id,
                                message : r.message,
                                type : r.type,
                                picture : r.picture || '',
                                link : r.link || '',
                                name : r.name || '',
                                description : r.description || '',
                                icon : r.icon || '',
                                created_time : r.created_time || ''
                            }
                            next(false, exports );
                        }
                    }
                }
            }
        });

}

// -----------------------------------------------------------------------------
module.exports = GetTimelineMine;
