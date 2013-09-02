/**
 * 
 * The Bipio Facebook Pod.  Facebook Actions and Content Emitters
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
var Pod = require('bip-pod'),
    Facebook = new Pod({
        name : 'facebook',
        description : 'Facebook',
        description_long : 'Facebook is a social networking website where users may create a personal profile, add other users as friends, and exchange messages, including automatic notifications when they update their profile.',
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
                    'read_stream'
                ]
            }
        },
        dataSources : [ require('./models/track_feed') ]
    });


// attach smtp forwarder
Facebook.add(require('./post_timeline_mine.js'));
Facebook.add(require('./get_timeline_mine.js'));

// -----------------------------------------------------------------------------
module.exports = Facebook;
