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

function PostPage(podConfig) {
  // pod name. alphanumeric + underscore only
  this.name = 'post_page';

  // quick description
  this.title = 'Post To Page';

  // long description
  this.description = 'Posts a message to a Page that you manage';

  // behaviors
  this.trigger = false; // can be a periodic trigger
  this.singleton = false; // only 1 instance per account
  this.podConfig = podConfig;
  FB.options(
  {
    'appSecret': podConfig.oauth.clientSecret,
    'appId' : podConfig.oauth.clientID
  }
  );
}

PostPage.prototype = {};

PostPage.prototype.getSchema = function() {
  return {
    'config' : {
      properties : {
        'page_id' : {
          type : 'string',
          description : 'Page ID',
          oneOf : [
            {
              '$ref' : '/renderers/my_pages/{id}'
            }
          ],
          label : {
            '$ref' : '/renderers/my_pages/{name}'
          }
        }
      },
      required : [ 'page_id' ]
    },
    "exports" : {
      properties : {
        "id" : {
          type : "string",
          description: "Post ID"
        }
      }
    },
    "imports": {
      properties : {
        "message" : {
          type : "string",
          "description" : "New Post Content"
        },
        "link" : {
          type : "string",
          "description" : "URL (Optional)"
        }
      },
      required : [ 'message' ]
    }
  }
}

PostPage.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
  var log = this.$resource.log,
    payload = {
      access_token : sysImports.auth.oauth.token,
      message : imports.message
    }, f;

  if (channel.config.page_id && imports.message) {
    if (imports.link && /^http/i.test(imports.link)) {
      payload.link = imports.link;
    }

    FB.api(
    '/' + channel.config.page_id  +'/feed',
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
}

// -----------------------------------------------------------------------------
module.exports = PostPage;
