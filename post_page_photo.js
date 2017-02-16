/**
 *
 * The Bipio Facebook Pod
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
var FormData = require('form-data'),
  https = require('https');
  fs = require('fs');

function PostPagePhoto() {}

PostPagePhoto.prototype = {};

PostPagePhoto.prototype._postPhoto = function(channel, params, sysImports, next) {
  var log = this.$resource.log,
    client = this.pod.getClient(sysImports);

  client.api(
  '/' + imports.page_id  +'/photos',
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
}

/**
 * Invokes (runs) the action.
 *
 */
PostPagePhoto.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
  var log = this.$resource.log,
    self = this,
    client = this.pod.getClient(sysImports),
    params = this.pod.initParams(sysImports),
    moment = this.$resource.moment,
    f, p, requestUrl;

  params.message = imports.message;

  if (contentParts._files && contentParts._files.length) {
    for (var i = 0; i < contentParts._files.length; i++) {
      f = contentParts._files[i];
      // post the first image found
      if (0 === f.type.indexOf('image')) {

        this.$resource.file.get(f, function(err, fileStruct, stream) {
          if (err) {
            next(err);
          } else {
            var form = new FormData(); //Create multipart form
            form.append('source', stream); //Put file

            requestUrl = '/' + imports.page_id + '/photos?access_token=' + params.access_token;

            if (params.message) {
              requestUrl += '&message=' + encodeURIComponent(params.message);
            }

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
        });
        break;
      }
    }
  } else {
    if (imports.url) {
      params.url = imports.url;
      this._postPhoto(channel, params, sysImports, next);
    }
  }

}

// -----------------------------------------------------------------------------
module.exports = PostPagePhoto;
