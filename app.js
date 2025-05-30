const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session'); 
const bodyParser = require('body-parser');
const multer = require('multer')
const path = require('path');
const User = require('./user')

// MongoDB connection
mongoose.connect('mongodb+srv://ellygrace711:4pn5oZJbNHCLAUPl@ellysbooth.qkrmyo2.mongodb.net/photoboothInfo', { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

const app = express();
const port = 3000;

// using express-session for storing current users
app.use(session({
    secret: 'photobooth',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
// middleware and joining files
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// signup route
app.post('/signup', async (req, res) => {
    const {email, password } = req.body;

    // check if email is in database
    const emailcheck = await User.findOne({ email }); 
    if (emailcheck) { 
    return res.status(409).json({ message: 'Email already exists' });
    }

    try {
        // store user in db and store in their id and email in session
        const newUser  = new User({ email, password});
        await newUser.save();
        req.session.userId = newUser._id
        req.session.email = newUser.email

        res.status(201).send('User registered successfully!');

    } catch (error) {
        res.status(400).send('Error registering user: ' + error.message);
    }
});
// login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // find user in db
        const user = await User.findOne({ email, password });
        if (user) {

            // set session
            req.session.userId = user._id;
            req.session.email = user.email;

            res.json({ message: 'Login successful' });
            
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// configure multer for storing images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // store image in uploads file
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// route to save images to the db
app.post('/upload', upload.array('photos'), async (req, res) => {

    try {
        // get the user from the session
        const userId = req.session.userId;
        // check if they exist
        if (!userId) {
            return res.status(401).json({ error: 'User  not authenticated' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User  not found' });
        }

        // save the image paths to db
        const imagePaths = req.files.map(file => file.path); // get paths of uploaded files
        user.images = [...(user.images || []), ...imagePaths]; // append new images to existing ones
        await user.save();

        // display the photostrip
        res.json({
            message: 'Photostrip saved successfully',
            images: imagePaths,
            id: user._id
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error uploading photos' });
    }
});

// route to get the images from the database
app.get('/images', async (req, res) => {
    const userId = req.session.userId;
    try {
        const user = await User.findById(userId).select("images");
        
        if (user) {
            res.status(200).json({ images: user.images || [] }); // gets the users images
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error fetching images", error });
    }   
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
