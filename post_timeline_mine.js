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

function PostTimelineMine(podConfig) {
  // pod name. alphanumeric + underscore only
  this.name = 'post_timeline_mine';

  // quick description
  this.title = 'Post To My Timeline';

  // long description
  this.description = 'Any message this Channel receives will get posted to your Facebook Timeline';

  // behaviors
  this.trigger = false; // can be a periodic trigger
  this.singleton = true; // only 1 instance per account
  this.podConfig = podConfig;
  FB.options(
  {
    'appSecret': podConfig.oauth.clientSecret,
    'appId' : podConfig.oauth.clientID
  }
  );
}

PostTimelineMine.prototype = {};

PostTimelineMine.prototype.getSchema = function() {
  return {
    'exports' : {
      properties : {
        'id' : {
          type : "string",
          description: 'Wall Post ID'
        }
      }
    },
    "imports": {
      properties : {
        "message" : {
          type : "string",
          "description" : "New Timeline Content"
        },
        "link" : {
          type : "string",
          "description" : "URL (Optional)"
        }
      }
    }
  };
}

/**
 * Invokes (runs) the action.
 *
 */
PostTimelineMine.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
  var log = this.$resource.log,
  payload = {
    access_token : sysImports.auth.oauth.token,
    message : imports.message
  };

  if (imports.link && /^http/i.test(imports.link)) {
    payload.link = imports.link;
  }

  FB.api(
    '/' + sysImports.auth.oauth.profile.username  +'/feed',
    'post',
    payload,
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
}

// -----------------------------------------------------------------------------
module.exports = PostTimelineMine;
