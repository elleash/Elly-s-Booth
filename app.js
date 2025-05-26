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

app.use(session({
    secret: 'photobooth',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/signup', async (req, res) => { // Allow up to 3 files
    console.log('Request Body:', req.body); // Debugging line
    const {email, password } = req.body;

    // check if email is in database
    const emailcheck = await User.findOne({ email }); 
    if (emailcheck) { 
    return res.status(409).json({ message: 'Email already exists' });
    }

    try {
        const newUser  = new User({ email, password});
        await newUser.save();
        // Store user ID and email in session
        req.session.userId = newUser._id
        req.session.email = newUser.email

        res.status(201).send('User registered successfully!');

    } catch (error) {
        res.status(400).send('Error registering user: ' + error.message);
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });
        if (user) {

            req.session.userId = user._id; // Set session on login
            req.session.email = user.email;

            res.json({ message: 'Login successful' });
            
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.array('photos'), async (req, res) => {

    try {

        // Get the user ID from the session
        const userId = req.session.userId;
        // Check if userId exists
        if (!userId) {
            return res.status(401).json({ error: 'User  not authenticated' });
        }
        // Find the user by ID and update their images
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User  not found' });
        }

        // Save file paths to DB
        const imagePaths = req.files.map(file => file.path); // Get paths of uploaded files
        user.images = [...(user.images || []), ...imagePaths]; // Append new images to existing ones
        await user.save();

        // Send back URLs to images to display photostrip
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

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
