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
var url = require('url');
function getPostPhoto() {}

getPostPhoto.prototype = {};

getPostPhoto.prototype.setup = function(channel, accountInfo, next) {
	this.pod.trackingStart(channel, accountInfo, true, next);
}

getPostPhoto.prototype.teardown = function(channel, accountInfo, next) {
	this.pod.trackingRemove(channel, accountInfo, next);
}

getPostPhoto.prototype.trigger = function(imports, channel, sysImports, contentParts, next) {
	  var pod = this.pod,
	  $resource = this.$resource,
	    self = this;
	  dataDir = pod.getDataDir(channel, this.name);
	  
	  pod.trackingGet(channel, function(err, since) {
	    if (err) {
	      next(err);
	    } else {
	      pod.trackingUpdate(channel, function(err, until) {
	        if (err) {
	          next(err);
	        } else {
	          imports.since = since;
	          imports.until = until;

	          self.invoke(imports, channel, sysImports, contentParts, function(err, photo) {
	            if (err) {
	              next(err);
	            } else {
	            	var fileName = photo.source.match(/\w*\.jpg/).shift(),
					outFile = dataDir + '/' + fileName;
	            	$resource._httpStreamToFile(
							photo.source,
							outFile,
							function(err, fileStruct) {
								if (err) {
									next(err);
								} else {
									next(false, photo, { _files : [ fileStruct ] }, fileStruct.size);
								}
							}
						);
	            }
	          });
	        }
	      });
	    }
	  });
	}
/**
 * Invokes (runs) the action.
 *
 */
getPostPhoto.prototype.invoke = function(imports, channel, sysImports, contentParts, next) {
	  var $resource = this.$resource,
      self = this,
      client = this.pod.getClient(sysImports);
    // get last tracking time
    var args = self.pod.initParams(sysImports);

    
    client.api('/v2.3/' + JSON.parse(sysImports.auth.oauth.profile).id +'/photos/tagged', 'get', args,
        function (res) {


            var err = false;
            var forwardOk = false;
            if (res.error) {
                next(res.error, exports);
                // expired token
                if (res.error.code == 190 && res.error.error_subcode == 466) {
                    next(res.error.message);
                    consol.log("message:"+res.error.message)
                }
            } else {
                if (res.data.length > 0) {
	                for (var i = 0; i < res.data.length; i++) {
	                	for(var j=0;j<res.data[i].tags.data.length;j++){
	                		if(res.data[i].tags.data[j].id==JSON.parse(sysImports.auth.oauth.profile).id){
	                			var created_tags = new Date(res.data[i].tags.data[j].created_time).getTime();
			                	if(created_tags>imports.since*1000 && created_tags < imports.until*1000){
				                            next(false, res.data[i] );
			                	}		
	                		}
	                	}
	                }
                }
            }
        });
}

// -----------------------------------------------------------------------------
module.exports = getPostPhoto;