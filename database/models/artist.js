const mongoose = require('mongoose')

var Schema = mongoose.Schema;

var ArtistSchema = new Schema(
    {
        first_name: { type: String, required: false, maxLength: 100},
        family_name: {type: String, required: false, maxLength: 100},
        group_name: {type: String, required: false, maxLength: 100},
        nick_name: {type: String, required: true, maxLength: 100},
        picture: {type: Object}
    }
);

// Virtual for authors full name
ArtistSchema
    .virtual('fullname')
    .get(function(){
        return this.first_name + " " + this.family_name})

ArtistSchema
.virtual('name')
.get(function(){
    if (this.group_name) {
        return this.group_name}
    else {
        return this.nick_name
    }
    
})


// Virtual for Authors URL
ArtistSchema
    .virtual('url')
    .get(function() {
        return `/store/artist/${this._id}`
    })

module.exports = mongoose.model('Artist', ArtistSchema)
