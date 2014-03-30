/**
 *
 * The Bipio Facebook Pod
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
var FB = require('fb'),
  FormData = require('form-data'),
  https = require('https');
  fs = require('fs');

function PostPagePhoto(podConfig) {
  // pod name. alphanumeric + underscore only
  this.name = 'post_page_photo';

  // quick description
  this.description = 'Post Photo To Page';

  // long description
  this.description_long = 'Posts a Photo to a Page that you manage.  Any image files it receives will also be uploaded';

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

PostPagePhoto.prototype = {};

PostPagePhoto.prototype.getSchema = function() {
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
        /* temporarily disabled. Permission scoping issues
        published : {
          type : 'boolean',
          description : 'Auto Publish',
          "default" : true
        },
        scheduled_publish_time : {
          type : 'string',
          description : 'Publish Time',
          "default" : 0
        }*/
      }
    },
    "exports" : {
      properties : {
        "id" : {
          type : "string",
          description: "Photo ID"
        },
        "post_id" : {
          type : "string",
          description: "Post ID"
        }
      }
    },
    "imports": {
      properties : {
        "message" : {
          type : "string",
          "description" : "Photo Description"
        },
        "url" : {
          type : "string",
          "description" : "URL (Optional)"
        }
      }
    }
  }
}

PostPagePhoto.prototype._postPhoto = function(channel, payload, next) {
  var log = this.$resource.log;

  FB.api(
  '/' + channel.config.page_id  +'/photos',
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

PostPagePhoto.prototype._getPayload = function(imports, channel, sysImports) {
  var payload = {
    access_token : sysImports.auth.oauth.token,
    message : imports.message,
    //published : channel.config.published
  };
/*
  if (channel.config.scheduled_publish_time) {
    var pubTime = Number(channel.config.scheduled_publish_time);
    if (isNaN(pubTime)) {
      pubTime = moment(pubTime);
    }
    if (pubTime) {
      payload.scheduled_publish_time = pubTime;
    }
  }
*/
  return payload;
}


/**
 * Invokes (runs) the action.
 *
 */
PostPagePhoto.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
  var log = this.$resource.log,
    self = this,
    moment = this.$resource.moment,
    payload, f, p, requestUrl;

  if (channel.config.page_id) {

    if (contentParts._files && contentParts._files.length) {
      for (var i = 0; i < contentParts._files.length; i++) {
        f = contentParts._files[i];
        if (0 === f.type.indexOf('image')) {

          payload = self._getPayload(imports, channel, sysImports);

          var form = new FormData(); //Create multipart form
          form.append('source', fs.createReadStream(f.localpath)); //Put file

          requestUrl = '/' + channel.config.page_id + '/photos?access_token=' + payload.access_token;

          if (payload.message) {
            requestUrl += '&message=' + encodeURIComponent(payload.message);
          }

          /*
          requestUrl += '&published=' + payload.published;

          if (payload.scheduled_publish_time) {
            requestUrl += '&scheduled_publish_time=' + payload.scheduled_publish_time;
          }*/

          var options = {
              method: 'post',
              host: 'graph.facebook.com',
              path: requestUrl,
              headers: form.getHeaders()
          }

          //Do POST request, callback for response
          var request = https.request(options, function (res){
            if (200 === res.statusCode) {
              res.on('data', function(data) {
                var resp = JSON.parse(data);
                next(false, resp, contentParts, f.size);
              });

              res.on('end', function() {
              })
            } else {
              next(res.headers['www-authenticate']);
            }
          });

          request.on('error', function (error) {
            next(error);
          });

          form.pipe(request);
        }
      }
    }

    if (imports.url) {
      payload = this._getPayload(imports, channel, sysImports);
      payload.url = imports.url;
      this._postPhoto(channel, payload, next);
    }
  }
}

// -----------------------------------------------------------------------------
module.exports = PostPagePhoto;
