require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios'); // Add axios for making HTTP requests
const multer = require('multer'); // Add multer for handling file uploads

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db('NutriTrack_db');  // Your database name
    // Ensure email is unique in the profile collection
    await db.collection('profile').createIndex({ email: 1 }, { unique: true });
    console.log("Unique index created on email field in profile collection");

  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1); // Exit the process if DB connection fails
  }
})();

// Routes

// Allergens GET with email filter
app.get('/api/allergens', async (req, res) => {
  const { email } = req.query;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required to fetch allergens." });
    }
    const allergens = await db.collection('allergens').find({ email }).toArray();
    res.json(allergens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/allergens', async (req, res) => {
  try {
    const allergen = req.body;
    if (!allergen.email) {
      return res.status(400).json({ message: "Email is required." });
    }
    await db.collection('allergens').insertOne(allergen);
    res.status(201).json(allergen);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// MealPlanner GET with email filter
app.get('/api/mealPlanner', async (req, res) => {
  const { email } = req.query;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required to fetch meal plans." });
    }
    const meals = await db.collection('mealPlanner').find({ email }).toArray();
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/mealPlanner', async (req, res) => {
  try {
    const meal = req.body;
    if (!meal.email) {
      return res.status(400).json({ message: "Email is required." });
    }
    await db.collection('mealPlanner').insertOne(meal);
    res.status(201).json(meal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Profile Routes
app.get('/api/profile', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const profile = await db.collection('profile').findOne({ email });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const profile = req.body;
    if (!profile.email) {
      return res.status(400).json({ message: "Email is required." });
    }

    await db.collection('profile').replaceOne(
      { email: profile.email },  // Filter by email
      profile,                   // Replace or insert this profile
      { upsert: true }           // Upsert option ensures the document is inserted if not found
    );

    res.status(201).json(profile);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ message: "A profile with this email already exists." });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

app.get('/api/hasdetails', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const profile = await db.collection('profile').findOne({ email });

    if (profile) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const FormData = require('form-data'); // Import the form-data library

// New Route: /api/scanfood for file uploads to envs.sh
app.post('/api/scanfood', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Create a new FormData instance
    const form = new FormData();

    // Append the file buffer to the form data
    form.append('file', req.file.buffer, {
      filename: req.file.originalname, // Use the original file name
      contentType: req.file.mimetype,  // Use the file's MIME type
    });

    // Upload the file to envs.sh
    const response = await axios.post('https://envs.sh', form, {
      headers: {
        ...form.getHeaders(), // Include the form-data headers
      },
    });

    if (response.status !== 200) {
      return res.status(500).json({ message: "Error uploading file to envs.sh" });
    }

    // Extract the URL from the response
    const fileUrl = response.data.replace('\n', '').replace('https://envs.sh/', '');

    // Send the URL back to the client
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing file upload" });
  }
});

// Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));