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
// https://github.com/Thuzi/facebook-node-sdk
var FB = require('fb'),
    url = require('url');

function GetTimelineMine(podConfig) {
    // pod name. alphanumeric + underscore only
    this.name = 'get_timeline_mine';

    // quick description
    this.title = 'Retrieve My Timeline';

    // long description
    this.description = 'Retrieves the latest messages posted to your timeline';

    // behaviors
    this.trigger = true; // can be a periodic trigger
    this.singleton = false; // only 1 instance per account
    this.podConfig = podConfig;
    FB.options(
        {
            'appSecret': podConfig.oauth.clientSecret,
            'appId' : podConfig.oauth.clientID
        }
    );
}

GetTimelineMine.prototype = {};

GetTimelineMine.prototype.getSchema = function() {
    // https://developers.facebook.com/docs/reference/api/post/
    return {
        'config' : {
            properties : {
                'me_only' : {
                    type : 'boolean',
                    'default' : false,
                    description : 'Retrieve only Posts By Me'
                }
            }
        },
        'exports' : {
            properties : {
                'id' : {
                    type : "string",
                    description: 'Post ID'
                },
                'message' : {
                    type : "string",
                    description: 'Message'
                },
                'type' : {
                    type : "string",
                    description: 'Post type'
                },
                'picture' : {
                    type : "string",
                    description: 'Picture URL'
                },
                'link' : {
                    type : "string",
                    description: 'Link URL'
                },
                'name' : {
                    type : "string",
                    description: 'Link Name'
                },
                'description' : {
                    type : "string",
                    description: 'Link Description'
                },
                'icon' : {
                    type : "string",
                    description: 'Link Icon'
                }
                ,
                'created_time' : {
                    type : "string",
                    description: 'UTC Created Time'
                }
            }
        }
    };
}

GetTimelineMine.prototype.setup = function(channel, accountInfo, next) {
     var $resource = this.$resource,
        self = this,
        dao = $resource.dao,
        log = $resource.log,
        modelName = this.$resource.getDataSourceName('track_feed');

    (function(channel, accountInfo, next) {
        // start tracking from now.
        var trackingStruct = {
            owner_id : channel.owner_id,
            channel_id : channel.id,
            last_update : app.helper.nowUTCSeconds()
        }
        model = dao.modelFactory(modelName, trackingStruct, accountInfo);
        dao.create(model, function(err, result) {
            if (err) {
                log(err, channel, 'error');
            }
            next(err, 'channel', channel); // ok
        }, accountInfo);
    })(channel, accountInfo, next);
};

/**
 * Drop timeline tracker
 *
 * @todo deprecate - move to pods unless action has teardown override
 */
GetTimelineMine.prototype.teardown = function(channel, accountInfo, next) {
  this.$resource.dao.removeFilter(
    this.$resource.getDataSourceName('track_feed'),
    {
      owner_id : channel.owner_id,
      channel_id : channel.id
    },
    next
  );
};

/**
 * Invokes (runs) the action.
 *
 */
GetTimelineMine.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
    var $resource = this.$resource,
        self = this,
        dao = $resource.dao,
        log = $resource.log,
        modelName = this.$resource.getDataSourceName('track_feed');

    (function(imports, channel, sysImports, next) {

        // get last tracking time
        dao.find(modelName, { owner_id : channel.owner_id, channel_id : channel.id }, function(err, result) {
            if (err) {
                log(err, channel, 'error');
                next(err, {});
            } else {
                var args = {
                    access_token : sysImports.auth.oauth.token
                }

                if (imports._url) {
                    var urlTokens = url.parse(imports._url, true);
                    if (urlTokens.query.until) {
                       args.until = urlTokens.query.until;
                    }

                    if (!args.until) {
                        log('Could not follow next URL', channel, 'error');
                        return;
                    }
                } else {
                    args.since =  Math.floor(result.last_update / 1000);
                }

                FB.api(
                    '/' + sysImports.auth.oauth.profile.username  +'/feed',
                    'get',
                    args,
                    function (res) {
                        var exports = {};
                        var err = false;
                        var forwardOk = false;
                        if (res.error) {
                            log(res.error.message, channel, 'error');
                            next(res.error, exports);
                            // expired token
                            if (res.error.code == 190 && res.error.error_subcode == 466) {
                                // @todo disable all channels in this pod for this user, and
                                // generate a system notice for the user that their channels
                                // have been disabled
                            }
                        } else {
                            // update tracking
                            dao.updateColumn(modelName, { id : result.id }, { last_update : app.helper.nowUTCSeconds() });

                            if (res.data.length > 0) {
                                var exports, r, justMe = (channel.config.me_only && app.helper.isTrue(channel.config.me_only));
                                for (var i = 0; i < res.data.length; i++) {
                                    r = res.data[i];
                                    if ((justMe && r.message && r.message !== '' && r.from.id === sysImports.auth.oauth.profile.id) ||
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

                            /*
                             * disbled - next&prev do not work where since. It
                             * pages forever.
                             *
                            // more results? then call myself
                            if (res.paging && res.paging.next) {
                                self.invoke({
                                    _url : res.paging.next
                                    }, channel, sysImports, contentParts, next);
                            }
                            */
                        }
                    });
            }
        });
    })(imports, channel, sysImports, next);
}

// -----------------------------------------------------------------------------
module.exports = GetTimelineMine;
