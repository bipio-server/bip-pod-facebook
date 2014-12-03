/**
 *
 * The Bipio Facebook Pod
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
var FormData = require('form-data'),
  https = require('https');
  fs = require('fs');

function PostPagePhoto() {}

PostPagePhoto.prototype = {};

PostPagePhoto.prototype._postPhoto = function(channel, params, sysImports, next) {
  var log = this.$resource.log,
    client = this.pod.getClient(sysImports);

  client.api(
  '/' + channel.config.page_id  +'/photos',
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

            requestUrl = '/' + channel.config.page_id + '/photos?access_token=' + params.access_token;

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
