const mongoose = require('mongoose')

var Schema = mongoose.Schema;

var RecordSchema = new Schema(
    {
        name: { type: String, required: true},
        artist: {type: Schema.Types.ObjectId, ref: "Artist", required: true},
        description: { type: String, required: false},
        genre: [{type: Schema.Types.ObjectId, ref: "Genre"}],
        price: { type: Number, required: true },
        items_in_stock: { type: Number, required: true},
        picture: {type: Object}

    }
);

// Virtual for books URL
RecordSchema
    .virtual("url")
    .get(function () { 
        return '/store/record/' + this._id;
    });

RecordSchema
    .virtual("price_euro")
    .get(function () { 
        return `${this.price}€`;
});

module.exports = mongoose.model('Record', RecordSchema)