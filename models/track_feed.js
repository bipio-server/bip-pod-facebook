/**
 * 
 * Stores metadata for a syndication feed channel
 * 
 */
FeedTracking = {};
FeedTracking.entityName = 'track_feed';
FeedTracking.entitySchema = {
    id: {
        type: String,
        renderable: false,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        writable: false
    },
    
    created : {
        type: String,
        renderable: false,
        writable: false
    },
    
    // last append time
    last_update : {
        type : String,
        renderable : false,
        writable : false
    },
    
    channel_id : {
        type : String,
        renderable : false,
        writable : false
    }
};

FeedTracking.compoundKeyContraints = {
    channel_id : 1,
    owner_id : 1
};

module.exports = FeedTracking;