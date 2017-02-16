/**
 *
 * The Bipio Facebook Pod.  post_timeline_mine action definition
 * ---------------------------------------------------------------
 *  Posts a message to users facebook wall
 * ---------------------------------------------------------------
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
function PostPage() {}

PostPage.prototype = {};

PostPage.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
  var log = this.$resource.log,
    client = this.pod.getClient(sysImports),
    params = this.pod.initParams(sysImports),
    f;

  params.message = imports.message;

  if (imports.link && /^http/i.test(imports.link)) {
    params.link = imports.link;
  }

  client.api(
  '/' + imports.page_id  +'/feed',
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

// -----------------------------------------------------------------------------
module.exports = PostPage;
