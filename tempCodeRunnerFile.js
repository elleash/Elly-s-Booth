const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer')
const path = require('path');
const PhotoStrip = require('./user')

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/EllysBooth', { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.array('photos', 4), async (req, res) => {
    try {
      if (!req.files || req.files.length !== 4) {
        return res.status(400).json({ error: 'Exactly 4 photos are required.' });
      }
      // Save file paths to DB
      const imagePaths = req.files.map(file => file.path); // Get paths of uploaded files
  
      const photoStrip = new PhotoStrip({
        images: imagePaths
      });
      await photoStrip.save();
  
      // Send back URLs to images to display photostrip
      res.json({
        message: 'Photostrip saved successfully',
        images: imagePaths,
        id: photoStrip._id
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Server error uploading photos' });
    }
  });

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
