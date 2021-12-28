var Record = require('../database/models/record');
var Genre = require('../database/models/genre');
var Artist = require('../database/models/artist');

var async = require('async')
const { body, validationResult} = require('express-validator');

// Getting Password and Username for protected route from .env
require('dotenv').config()

const legitUsername = process.env.USERNAME
const legitPassword = process.env.PASSWORD


const multer = require('multer');

// Sets the default names for uploaded files and the storage location
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + 'RecordCover' + Math.round(Math.random() * 1000)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const upload = multer({ storage: storage})

exports.index = function(req, res) {
    async.parallel({
        record_count: callback => Record.countDocuments({}, callback),
        genre_count: callback => Genre.countDocuments({}, callback),
        artist_count: callback => Artist.countDocuments({}, callback)
    }, (err, results) => {
        res.render('index', {title: "SubGuy's Recordshop", error: err, data: results})
    })
};

// Display list of all records.
exports.record_list = function(req, res, next) {
    
    Record.find({},)
        .sort({name : 1})
        .populate('artist')
        .populate('genre')
        .exec( (err, list_records)=> {
            if (err) { return next(err)}
            
            res.render('record_list', {title: 'List of Records', record_list: list_records})
        })
};

// Display detail page for a specific record.
exports.record_detail = function(req, res, next) {
    Record.findById(req.params.id)
        .populate('artist')
        .populate('genre')
        .exec( (err, record) => {
            if (err) {return next(err)}
            res.render('record_detail', {title: 'Record Detail', record})
        })
};

// Display record create form on GET.
exports.record_create_get = function(req, res, next) {
    async.parallel({
        artists: callback => Artist.find(callback),
        genres: callback => Genre.find(callback)   
    },
    (err, results) => {
        if (err) {return next(err)}
        res.render('record_form', { title: 'Create Record', artists: results.artists, genres: results.genres })
    })
};

// Handle record create on POST.
exports.record_create_post = [
        // Convert the genre to an array
        (req, res, next) => {
            if(!(req.body.genre instanceof Array)) {
                if(typeof req.body.genre ==='undefined')
                req.body.genre = []
                else
                req.body.genre = new Array(req.body.genre)
            }
            next()
        },
        upload.single('picture'),
        body('name').trim().isLength({ min: 3}).escape().withMessage("Record name has to be specified."),
        body('artist').trim().isLength({ min: 3}).escape().withMessage("Artist name has to be specified."),
        body('description').trim().isLength({min: 10, max: 480}).escape().optional({checkFalsy: true}),
        body('genre.*').escape(),
        body('price').trim().escape().isDecimal().withMessage("The price must be a decimal value!"),
        body('items_in_stock').trim().escape().isNumeric().withMessage("The quantity must be a number."),
        body('picture_url').trim().optional({checkFalsy: true}).isURL().withMessage("This is not a valid URL."),

    (req, res, next) => {
        const errors = validationResult(req)

        // create Record with form data
        var record = new Record(
            {
                name: req.body.name,
                artist: req.body.artist,
                description: req.body.description,
                genre: (typeof req.body.genre=='undefined') ? [] : req.body.genre,
                price: req.body.price,
                items_in_stock: req.body.items_in_stock,
                picture_url: req.body.picture_url,
                picture: req.file
            })

        if (!errors.isEmpty()) {
            //There are errors. Return error messages and render again.

            // get all authors and genre for form
            async.parallel({
                artists: callback => Artist.find(callback),
                genres: callback => Genre.find(callback),
        }, (err, results) => {
            if (err) {return next(err)}

            //Mark our selected genres as checked
            for (let i=0; i < results.genres.length; i++) {
                if (record.genre.indexOf(results.genres[i]._id) > -1) {
                    results.genres[i].checked='true'
                }
            }
            res.render('record_form', { title: 'Create Record', artists: results.artists, genres: results.genres, record: record, errors: errors.array() })
            });
            return;
        }
        else {
            // Data from form is valid. Save Record.
            record.save(err => {
                if (err) {return next(err)}
                // succesful
                res.redirect(record.url)
            });
        }
    }
];

// Display record delete form on GET.
exports.record_delete_get = function(req, res, next) {

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
        Record.findById(req.params.id)
            .populate('artist')
            .populate('genre')
            .exec( (err, record) => {
                if (err) {return next(err)}
                if (record==null) {
                    res.redirect('/store/records')
                }
                res.render('record_delete', {title: 'Record Delete', record: record})
            })
    }
};

// Handle record delete on POST.
exports.record_delete_post = function(req, res, next) {

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

        Record.findById(req.params.id)
            .populate('artist')
            .populate('genre')
            .exec( (err, record) => {
            if (err) {return next(err)}
            
            //Success
            Record.findByIdAndRemove(req.body.recordid, function deleteRecord(err) {
                if (err) {return next(err)}
                // Success
                res.redirect('/store/records')
            } )
        
        })
    }
};

// Display record update form on GET.
exports.record_update_get = function(req, res, next) {

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
    /// Get book, authors, and genres for form.
        async.parallel({
            record: cb => Record.findById(req.params.id).populate('artist').populate('genre').exec(cb),
            artists: cb => Artist.find(cb),
            genres: cb => Genre.find(cb)
        }, (err, results) => {
            
            if (err) {return next(err)}
            if (results.record==null) {
                var err = new Error('Record not found')
                err.status = 404
                return next(err)
            }
            //Success
            // Mark all our selected genres as checked

            for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
                for (var record_g_iter = 0; record_g_iter < results.record.genre.length; record_g_iter++) {
                    if (results.genres[all_g_iter]._id.toString()===results.record.genre[record_g_iter]._id.toString()) {
                        results.genres[all_g_iter].checked='true'
                    }
                }
            }
            res.render('record_form', {title: 'Update Record', artists: results.artists, genres: results.genres, record: results.record })
        })
    }
};

// Handle record update on POST.
exports.record_update_post = [

    // convert the genre to an array 
    (req, res, next) => {

        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre==='undefined') 
            req.body.genre=[]
            else
            req.body.genre= new Array(req.body.genre)
        }
        next()
    },

    // Validate and sanitize
        upload.single('picture'),
        body('name').trim().isLength({ min: 3}).escape().withMessage("Record name has to be specified."),
        body('artist').trim().isLength({ min: 3}).escape().withMessage("Artist name has to be specified."),
        body('description').trim().isLength({min: 10, max: 480}).escape().optional({checkFalsy: true}),
        body('genre.*').escape(),
        body('price').trim().escape().isDecimal().withMessage("The price must be a decimal value!"),
        body('items_in_stock').trim().escape().isNumeric().withMessage("The quantity must be a number."),
        body('picture_url').trim().optional({checkFalsy: true}).isURL().withMessage("This is not a valid URL."),

        // process request after validation and sanitization
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

                var record = new Record(
                    {
                        name: req.body.name,
                        artist: req.body.artist,
                        description: req.body.description,
                        genre: (typeof req.body.genre=='undefined') ? [] : req.body.genre,
                        price: req.body.price,
                        items_in_stock: req.body.items_in_stock,
                        picture_url: req.body.picture_url,
                        picture: req.file,
                        _id: req.params.id // Required or new ID will be assigned by MongoDB
                    });

                if (!errors.isEmpty()) {
                    // render form again with sanitized values and error messages
                    // get all authors and genre for form
                    async.parallel({
                        artists: callback => Artist.find(callback),
                        genres: callback => Genre.find(callback),
                    }, (err, results) => {
                        if (err) {return next(err)}

                    //Mark our selected genres as checked
                    for (let i=0; i < results.genres.length; i++) {
                        if (record.genre.indexOf(results.genres[i]._id) > -1) {
                            results.genres[i].checked='true'
                        }
                    }
                    res.render('record_form', { title: 'Create Record', artists: results.artists, genres: results.genres, record: record, errors: errors.array() })
                    });
                    return;
                }
                else {
                    // Data from form is valid!
                    Record.findByIdAndUpdate(req.params.id, record, {}, (err, thebook) => {
                        if (err) {return next(err)}
                        //Succesful
                        res.redirect(thebook.url)
                    });
                
                }  
            }
        }
] ;
