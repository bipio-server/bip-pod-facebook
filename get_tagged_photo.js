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
var url = require('url');
var lastCheck = new Date();
function getPostPhoto() {}

getPostPhoto.prototype = {};

getPostPhoto.prototype.setup = function(channel, accountInfo, next) {
	console.log("call setup");
	this.pod.trackingStart(channel, accountInfo, true, next);
}

getPostPhoto.prototype.teardown = function(channel, accountInfo, next) {
	console.log("call teardown");
	this.pod.trackingRemove(channel, accountInfo, next);
}

getPostPhoto.prototype.trigger = function(imports, channel, sysImports, contentParts, next) {
	console.log("call trigger");
	  var pod = this.pod,
	    self = this;

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

	          self.invoke(imports, channel, sysImports, contentParts, function(err, post) {
	            if (err) {
	              next(err);
	            } else {
	              next(false, post);
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
	console.log("call invoke");
	  var $resource = this.$resource,
      self = this,
      client = this.pod.getClient(sysImports);
    // get last tracking time
    var args = self.pod.initParams(sysImports);

   /* if (imports.since) {
       args.since = imports.since;
    }

    if (imports.until) {
    	args.until = imports.until;
    }*/

    
    client.api('/'+JSON.parse(sysImports.auth.oauth.profile).id+'/photos/tagged', 'get', args,
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
	                			console.log("found tag");
	                			console.log("from:"+new Date(imports.since*1000));
	                			console.log("to:"+new Date(imports.until*1000));
	                			var created_tags = new Date(res.data[i].tags.data[j].created_time).getTime();
			                	if(created_tags>imports.since*1000 && created_tags < imports.until*1000){
				                	 console.log(res.data[i]);
				                            next(false, res.data[i] );
			                	}		
	                		}
	                	}
	                }
                }
            }
        });
    lastCheck = new Date();
}

// -----------------------------------------------------------------------------
module.exports = getPostPhoto;
