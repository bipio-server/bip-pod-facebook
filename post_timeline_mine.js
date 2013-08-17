/**
 *
 * The Bipio Facebook Pod.  post_timeline_mine action definition
 * ---------------------------------------------------------------
 *  Posts a message to users facebook wall
 * ---------------------------------------------------------------
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 CloudSpark pty ltd http://www.cloudspark.com.au
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
    this.description = 'Post To My Timeline';

    // long description
    this.description_long = 'Any message this Channel receives will get posted to your Facebook Timeline';

    // behaviors
    this.trigger = false; // can be a periodic trigger
    this.singleton = true; // only 1 instance per account
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
                }
            }
        }
    };
}

/**
 * Returns a string representation for channels configured for this action
 **/
PostTimelineMine.prototype.repr = function() {
    return this.description;
}

/**
 * Invokes (runs) the action.
 *
 */
PostTimelineMine.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
    var log = this.$resource.log;

    FB.api(
        '/mine/feed',
        'post',
        {
            access_token : sysImports._oauth_token,
            message : imports.message
        },
        function (res) {
            var err = false;
            var forwardOk = false;
            if (res.error) {
                log(res.error, channel, 'error');                
                // expired token
                if (res.error.code == 190 && res.error.error_subcode == 466) {
                    // @todo disable all channels in this pod for this user, and
                    // generate a system notice for the user that their channels
                    // have been disabled
                    forwardOk = true;
                }
            }

            var exports = {
                'id' : res.id,
                'http_response_code' : res.code
            }
            next(res.error, exports);
        });
}

// -----------------------------------------------------------------------------
module.exports = PostTimelineMine;
