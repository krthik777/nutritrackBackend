require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Import ObjectId
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

// Allergens POST
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

// Allergens DELETE by ID
app.delete('/api/allergens/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid allergen ID." });
    }

    // Convert the ID to an ObjectId
    const objectId = new ObjectId(id);

    // Delete the allergen from the database
    const result = await db.collection('allergens').deleteOne({ _id: objectId });

    // Check if the allergen was found and deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Allergen not found." });
    }

    // Return success response
    res.status(200).json({ message: "Allergen deleted successfully." });
  } catch (error) {
    console.error('Error deleting allergen:', error);
    res.status(500).json({ message: "Failed to delete allergen. Please try again later." });
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

// MealPlanner POST
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

// Profile POST
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

// Check if profile details exist
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

// File upload for scanning food
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

    // Extract the URL from the response and ensure it includes the protocol
    const fileUrl = `https://envs.sh/${response.data.replace('\n', '').replace('https://envs.sh/', '')}`;

    // Send the URL back to the client
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing file upload" });
  }
});

app.post('/api/foodLog', async (req, res) => {
  try {
    const { email, dishName, calories, ingredients, servingSize, healthiness } = req.body;

    if (!email || !dishName || !calories || !ingredients || !servingSize || !healthiness) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Save the food log to the database
    await db.collection('foodLog').insertOne({
      email,
      dishName,
      calories,
      ingredients,
      servingSize,
      healthiness,
      timestamp: new Date(),
    });

    res.status(201).json({ message: "Food log saved successfully." });
  } catch (error) {
    console.error('Error saving food log:', error);
    res.status(500).json({ message: "Failed to save food log. Please try again later." });
  }
});

// FoodLog GET with email filter
app.get('/api/foodLog', async (req, res) => {
  const { email } = req.query;
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required to fetch food logs." });
    }
    const foodLogs = await db.collection('foodLog').find({ email }).toArray();
    res.json(foodLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/uploadImage', upload.single('file'), async (req, res) => {
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

    // Extract the URL from the response and ensure it includes the protocol
    const fileUrl = `https://envs.sh/${response.data.replace('\n', '').replace('https://envs.sh/', '')}`;

    // Send the URL back to the client
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: "Error processing file upload" });
  }
});

// Add this route to your backend code
app.get('/api/weeklycalo', async (req, res) => {
  const { email } = req.query;

  if (!email) {
      return res.status(400).json({ message: "Email is required." });
  }

  try {
      // Get current date and calculate week boundaries
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      endOfWeek.setHours(23, 59, 59, 999);

      // Aggregate calories by day of week
      const weeklyData = await db.collection('foodLog').aggregate([
          {
              $match: {
                  email: email,
                  timestamp: {
                      $gte: startOfWeek,
                      $lte: endOfWeek
                  }
              }
          },
          {
              $group: {
                  _id: {
                      $dayOfWeek: "$timestamp"
                  },
                  totalCalories: { $sum: "$calories" }
              }
          }
      ]).toArray();

      // Create default structure for all days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const result = days.map(day => ({
          day,
          calories: 0
      }));

      // MongoDB $dayOfWeek returns 1=Sunday to 7=Saturday
      weeklyData.forEach(item => {
          const dayIndex = (item._id - 1) % 7; // Convert to 0-based index
          result[dayIndex].calories = item.totalCalories;
      });

      res.json(result);

  } catch (error) {
      console.error('Error fetching weekly calories:', error);
      res.status(500).json({ message: "Failed to fetch weekly calories" });
  }
});

// Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));