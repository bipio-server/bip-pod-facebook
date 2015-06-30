/**
 *
 * The Bipio Facebook Pod.  get_timeline_mine action definition
 * ---------------------------------------------------------------
 *  Gets a users facebook timeline
 * ---------------------------------------------------------------
 *
 * @author Michael Pearson <michael@bip.io>
 * Copyright (c) 2010-2014 Michael Pearson michael@bip.io
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
    	'/v2.3/' + JSON.parse(sysImports.auth.oauth.profile).id  +'/feed',
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
