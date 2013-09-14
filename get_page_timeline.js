/**
 *
 * The Bipio Facebook Pod.  get_page_mine action definition
 * ---------------------------------------------------------------
 *  Gets a users facebook page
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
// https://github.com/Thuzi/facebook-node-sdk
var FB = require('fb'),
    url = require('url'),
    async       = require('async');

function GetPageTimeline(podConfig) {
    // pod name. alphanumeric + underscore only
    this.name = 'get_page_timeline';

    // quick description
    this.description = 'Retrieve A Page Timeline';

    // long description
    this.description_long = 'Retrieves the latest messages posted to one of your pages';

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

GetPageTimeline.prototype = {};

GetPageTimeline.prototype.getSchema = function() {
    // https://developers.facebook.com/docs/reference/api/user/
    return {
        'config' : {
            properties : {
                'me_only' : {
                    type : 'boolean',
                    'default' : true,
                    description : 'Retrieve only Posts By Page Admins'
                },
                'page_id' : {
                    type : 'string',
                    'default' : false,
                    description : 'Page ID'
                }
            }
        },
        'renderers' : {
            'my_pages' : {
                description : 'Get My Pages',
                contentType : DEFS.CONTENTTYPE_JSON,
                scope : 'pod'
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

/**
 *
 */
GetPageTimeline.prototype.rpc = function(method, sysImports, options, channel, req, res) {
    var dao = this.$resource.dao, modelName;

    // Remote client is performing a verify action.
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
        res.send(404);
    }
}

GetPageTimeline.prototype.setup = function(channel, accountInfo, next) {
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
 * Invokes (runs) the action.
 *
 */
GetPageTimeline.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
    var $resource = this.$resource,
    self = this,
    dao = $resource.dao,
    log = $resource.log,
    modelName = this.$resource.getDataSourceName('track_feed');

    (function(imports, channel, sysImports, next) {
        // get last tracking time
        dao.find(modelName, {
            owner_id : channel.owner_id, 
            channel_id : channel.id
        }, function(err, result) {
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
                    '/' + channel.config.page_id  +'/feed',
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
                            dao.updateColumn(modelName, {
                                id : result.id
                            }, {
                                last_update : app.helper.nowUTCSeconds()
                            });

                            if (res.data.length > 0) {
                                var exports, r, justMe = (channel.config.me_only && app.helper.isTrue(channel.config.me_only));
                                for (var i = 0; i < res.data.length; i++) {
                                    r = res.data[i];
                                    if ((justMe && r.message && r.message !== '' && r.from.id === channel.config.page_id) ||
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

                            // more results? then call myself
                            if (res.paging && res.paging.next) {
                                self.invoke({
                                    _url : res.paging.next
                                    }, channel, sysImports, contentParts, next);
                            }
                        }
                    });
            }
        });
    })(imports, channel, sysImports, next);
}

// -----------------------------------------------------------------------------
module.exports = GetPageTimeline;
