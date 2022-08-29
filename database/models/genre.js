const mongoose = require('mongoose')

var Schema = mongoose.Schema;

var GenreSchema = new Schema(
    {
        name: { type: String, required: true, minLength: 3, maxLength: 100 },
        description: { type: String, required: false, minLength: 10, maxLength: 240}
    }
);

GenreSchema
    .virtual("url")
    .get(function() {
        return `/store/genre/${this._id}`
    })

module.exports = mongoose.model('Genre', GenreSchema)