var Genre = require('../database/models/genre');
var Record = require('../database/models/record')
var async = require('async')
const { body, validationResult } = require('express-validator')

// Getting Password and Username for protected route from .env
require('dotenv').config()

const legitUsername = process.env.USERNAME
const legitPassword = process.env.PASSWORD

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    
    Genre.find()
        .sort([['name', 'ascending']])
        .exec((err, list_genres) => {
            if(err) {return next(err)}
            res.render('genre_list', { title: 'Genres', genre_list: list_genres })
        })
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res,next) {
    
    async.parallel({
        genre: callback => Genre.findById(req.params.id).exec(callback),
        genre_records: callback => Record.find({'genre': req.params.id}).populate('artist').exec(callback)
    }, (err, results) => {
        if (err) { return next(err)}
        if (results.genre==null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err)
        }
        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_records: results.genre_records})
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {
    res.render('genre_form', { title: 'Add Genre' })
};

// Handle Genre create on POST.
exports.genre_create_post = [
    body('name', 'Genre name required').trim().isLength({ min: 3, max: 100}).escape(),
    body('description', 'Invalid Description').trim().isLength({ min: 3, max: 240}).optional({checkFalsy: true}).escape(),

    (req, res, next ) => {
        const errors = validationResult(req);

        var genre = new Genre(
            { 
                name: req.body.name,
                description: req.body.description

            }
        )

        if (!errors.isEmpty()) {
            //There are errors! Render the form again with sanitized values/error messages.
            res.render('genre_form', {title: "Add Genre", genre: genre, errors: errors.array()})
            return
        }
        else {
            //check if Genre with same name already exists.
            Genre.findOne( { 'name': req.body.name})
                .exec( (err, found_genre) => {
                    if (err) { return next(err)}
                    if (found_genre) {
                        res.redirect(found_genre.url)
                    }
                    else {
                        genre.save(err => {
                            if(err) { return next(err)}
                            res.redirect(genre.url)
                        })
                    }
                })
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    
    const reject = () => {
        res.setHeader('www-authenticate', 'Basic')
        res.sendStatus(401)
    }
    
    const authorization = req.headers.authorization

    if(!authorization) {
        return reject()
    }

    const [username, password] = Buffer.from(authorization.replace('Basic',''), 'base64').toString().split(':')

    if(! (username == legitUsername && password == legitPassword)) {
        return reject()
    }

    else {

        async.parallel({
            genre: callback => Genre.findById(req.params.id).exec(callback),
            genres_records: callback => Record.find({ 'genre': req.params.id}).exec(callback)
        }, (err, results) => {
            if (err) {return next(err)}
            if (results.genre==null) {
                res.redirect('/store/genres')
            }
            res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_records: results.genres_records})
        })
    }
};



// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {

    const reject = () => {
        res.setHeader('www-authenticate', 'Basic')
        res.sendStatus(401)
    }
    
    const authorization = req.headers.authorization

    if(!authorization) {
        return reject()
    }

    const [username, password] = Buffer.from(authorization.replace('Basic',''), 'base64').toString().split(':')

    if(! (username == legitUsername && password == legitPassword)) {
        return reject()
    }

    else {


        async.parallel({
            genre: cb => Genre.findById(req.body.authorid).exec(cb),
            genres_records: cb => Record.find({ 'genre' : req.body.authorid}).exec(cb)
        }, (err, results) => {
            if (err) {return next(err)}
            //Success
            if (results.genres_records.length > 0) {
                // Artist has records
                res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_records: results.genres_records})
                return;
            }
            else {
                //Artist has no records
                Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
                    if (err) {return next(err)}
                    // Success
                    res.redirect('/store/genres')
                } )
            }
        
        
        })
    }
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {

    const reject = () => {
        res.setHeader('www-authenticate', 'Basic')
        res.sendStatus(401)
    }
    
    const authorization = req.headers.authorization

    if(!authorization) {
        return reject()
    }

    const [username, password] = Buffer.from(authorization.replace('Basic',''), 'base64').toString().split(':')

    if(! (username == legitUsername && password == legitPassword)) {
        return reject()
    }

    else {

        Genre.findById(req.params.id)
            .exec((err, genre) => {
                if (err) {return next(err)}
                if (genre==null) {
                    var err = new Error('Genre not found')
                    err.status = 404
                    return next(err)
                }
                res.render('genre_form', { title: 'Update Genre', genre: genre})
        })  
    }
};

// Handle Genre update on POST.
exports.genre_update_post = [
    body('name', 'Genre name required').trim().isLength({ min: 3, max: 100}).escape(),
    body('description', 'Invalid Description').trim().isLength({ min: 3, max: 240}).optional({checkFalsy: true}).escape(),
    (req, res, next) => {
        const reject = () => {
            res.setHeader('www-authenticate', 'Basic')
            res.sendStatus(401)
        }
        
        const authorization = req.headers.authorization
    
        if(!authorization) {
            return reject()
        }
    
        const [username, password] = Buffer.from(authorization.replace('Basic',''), 'base64').toString().split(':')
    
        if(! (username == legitUsername && password == legitPassword)) {
            return reject()
        }
    
        else {



            const errors = validationResult(req)

            var genre = new Genre(
                {
                    name: req.body.name,
                    description: req.body.description,
                    _id: req.params.id // Required or new ID will be assigned by MongoDB
                });

                if (!errors.isEmpty()) {
                    // render form again with sanitized values and error messages
                    // get all authors and genre for form
                    Genre.findById(req.params.id)
                    .exec((err, genre) => {
                        if (err) {return next(err)}
                        if (genre==null) {
                            var err = new Error('Genre not found')
                            err.status = 404
                            return next(err)
                        }
                   res.render('genre_form', { title: 'Update Genre',  genre: genre, errors: errors.array() })
                   });
                   return;
               }
               else {
                // Data from form is valid!
                Genre.findByIdAndUpdate(req.params.id, genre, {}, (err, thegenre) => {
                    if (err) {return next(err)}
                    //Succesful
                    res.redirect(thegenre.url)
                });
            
            } 
        }
    }
];
