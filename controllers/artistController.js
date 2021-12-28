var Artist = require('../database/models/artist');
var Record = require('../database/models/record');
var async = require('async')

const { body, validationResult } = require('express-validator')

require('dotenv').config()

const legitUsername = process.env.USERNAME
const legitPassword = process.env.PASSWORD



// Sets up the Multer middleware to handle picture uploads
const multer = require('multer');

// Sets the default names for uploaded files and the storage location
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + 'ArtistPic' + Math.round(Math.random() * 1000)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const upload = multer({ storage: storage})


// Display list of all Artists.
exports.artist_list = function(req, res, next) {

    Artist.find()
        .sort([['nick_name', 'ascending']])
        .exec((err, list_artists) => {
            if(err) {next(err)}
            res.render('artist_list', { title: 'Artist Roster', artist_list: list_artists })
        })
};

// Display detail page for a specific Artist.
exports.artist_detail = function(req, res, next) {
    
    async.parallel({
        artist: callback => Artist.findById(req.params.id).exec(callback),
        artist_records: callback => Record.find({'artist': req.params.id}).populate('genre').exec(callback)
    }, (err, results) => {
        if (err) { return next(err)}
        if (results.artist==null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err)
        }
        res.render('artist_detail', { title: 'Artist Detail', artist: results.artist, artist_records: results.artist_records})
    });


};

// Display Artist create form on GET.
exports.artist_create_get = function(req, res, next) {
    res.render('artist_form', { title: 'Create Artist'})
};

// Handle Artist create on POST.
exports.artist_create_post = [
    upload.single('picture'),
    body('first_name').trim().isLength({min: 1, max:100}).escape().optional({checkFalsy: true}),
    body('family_name').trim().isLength({min: 1, max:100}).escape().optional({checkFalsy: true}),
    body('group_name').trim().isLength({min: 1, max:100}).escape().optional({checkFalsy: true}),
    body('nick_name', 'Nickname must be specified.').trim().isLength({min: 1, max:100}).escape(),
    body('picture_url').trim().optional({checkFalsy: true}).isURL().withMessage("This is not a valid URL."),
    
    (req, res, next) => {
        console.log(req.file)
        // Extract Validation Errors from Request
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Render Form with error warnings.
            res.render('artist_form', { title: 'Create Artist', artist: req.body, errors: errors.array() });
            return;
        }
        
        else {
            
            var artist = new Artist( 
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    group_name: req.body.group_name,
                    nick_name: req.body.nick_name,
                    picture_url: req.body.picture_url,
                    picture: req.file
                    
                });
            artist.save((err) => {
                if (err) {return next(err)}
                // Succesful
                res.redirect(artist.url)   
            })
        }
    }
];
// Display Artist delete form on GET.
exports.artist_delete_get = function(req, res, next) {

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
            artist: callback => Artist.findById(req.params.id).exec(callback),
            artists_records: callback => Record.find({ 'artist': req.params.id}).exec(callback)
        }, (err, results) => {
            if (err) {return next(err)}
            if (results.artist==null) {
                res.redirect('/store/artists')
            }
            res.render('artist_delete', { title: 'Delete Artist', artist: results.artist, artist_records: results.artists_records})
        })

    }
};

// Handle Artist delete on POST.
exports.artist_delete_post = function(req, res, next) {

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
            artist: cb => Artist.findById(req.body.authorid).exec(cb),
            artists_records: cb => Record.find({ 'artist' : req.body.authorid}).exec(cb)
        }, (err, results) => {
            if (err) {return next(err)}
            //Success
            if (results.artists_records.length > 0) {
                // Artist has records
                res.render('artist_delete', { title: 'Delete Artist', artist: results.artist, artist_records: results.artists_records})
                return;
            }
            else {
                //Artist has no records
                Artist.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                    if (err) {return next(err)}
                    // Success
                    res.redirect('/store/artists')
                } )
            }
        
        
        })
    }
};

// Display Artist update form on GET.
exports.artist_update_get = function(req, res, next) {

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


        Artist.findById(req.params.id)
            .exec( (err, artist) => {
                if (err) {return next(err)}
                if (artist==null) {
                    res.redirect('/store/artists')
                }
                res.render('artist_form', {title: 'Artist Update', artist: artist})
        })
    }
};

// Handle Artist update on POST.
exports.artist_update_post = [
        upload.single('picture'),
        body('first_name').trim().isLength({min: 1, max:100}).escape().optional({checkFalsy: true}),
        body('family_name').trim().isLength({min: 1, max:100}).escape().optional({checkFalsy: true}),
        body('group_name').trim().isLength({min: 1, max:100}).escape().optional({checkFalsy: true}),
        body('nick_name').trim().isLength({min: 1, max:100}).escape().withMessage('Nickname must be specified.'),
        body('picture_url').trim().optional({checkFalsy: true}).isURL().withMessage("This is not a valid URL."),
    
    
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
                // Extract Validation Errors from Request
                const errors = validationResult(req);
        
                if (!errors.isEmpty()) {
                    // There are errors. Render Form with error warnings.
                    res.render('artist_form', { title: 'Create Artist', artist: req.body, errors: errors.array() });
                    return;
                }
                
                else {
                    var artist = new Artist( 
                        {
                            first_name: req.body.first_name,
                            family_name: req.body.family_name,
                            group_name: req.body.group_name,
                            nick_name: req.body.nick_name,
                            picture_url: req.body.picture_url,
                            picture: req.file,
                            _id: req.params.id
                        });
                    Artist.findByIdAndUpdate(req.params.id, artist, {}, (err, theartist) => {
                        if (err) {return next(err)}
                        // Succesful
                        res.redirect(theartist.url)   
                    })
                }
            }
        }
    ];

