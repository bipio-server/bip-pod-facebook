/**
 *
 * The Bipio Facebook Pod.  post_timeline_mine action definition
 * ---------------------------------------------------------------
 *  Posts a message to users facebook wall
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
var FB = require('fb');

function PostTimelineMine() {}

PostTimelineMine.prototype = {};

/**
 * Invokes (runs) the action.
 *
 */
PostTimelineMine.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
  var log = this.$resource.log,
    client = this.pod.getClient(sysImports),
    params = this.pod.initParams(sysImports);

  params.message = imports.message;

  if (imports.link && /^http/i.test(imports.link)) {
    params.link = imports.link;
  }

  try {
    client.api(
      '/' + JSON.parse(sysImports.auth.oauth.profile).username  +'/feed',
      'post',
      params,
      function (res) {
        var err = false;
        var forwardOk = false;
        if (res.error) {
          log(res.error.message, channel, 'error');
          // expired token
          if (res.error.code == 190 && res.error.error_subcode == 466) {
            // @todo disable all channels in this pod for this user, and
            // generate a system notice for the user that their channels
            // have been disabled
            forwardOk = true;
          }
        }

        var exports = {
          'id' : res.id
        }

        next(res.error, exports);
      });
  } catch (e) {
    next(e);
  }
}

// -----------------------------------------------------------------------------
module.exports = PostTimelineMine;
