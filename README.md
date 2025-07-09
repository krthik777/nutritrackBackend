# NutriTrack Backend 🛠️

This is the backend service for the [NutriTrack](https://github.com/krthik777/nutritrack) app — an AI-powered nutrition tracker.

## 🧩 Overview

Built with **Express.js** and **MongoDB**, this backend powers NutriTrack’s features such as:

- 📦 Food logging with calories, macros, and health metadata
- 🧬 Weekly nutrition analysis (calories, protein, carbs, fat)
- 🧍‍♂️ User profile management with upsert functionality
- ⚠️ Allergen tracking per user
- 🗓 Meal planner management
- 🖼 Image upload support via [envs.sh](https://envs.sh)
- 🔐 Secure API routes with email-based data separation

## 🚀 Tech Stack

| Component        | Technology        |
|------------------|------------------|
| Backend Framework| Express.js       |
| Database         | MongoDB          |
| File Upload      | Multer + Axios   |
| External Hosting | envs.sh (for image URLs) |
| Environment Vars | dotenv           |
| Data Handling    | body-parser      |
| CORS             | Enabled via `cors` package |

## ⚙️ Setup & Installation

```bash
git clone https://github.com/krthik777/nutritrackBackend.git
cd nutritrackBackend

# Install dependencies
npm install

# Create your .env file with:
# MONGO_URI=<your MongoDB connection string>
touch .env

# Start the server
npm start
```

The server will run on `http://localhost:5000` by default.

## 🔌 API Endpoints (Summary)

- `GET /api/allergens?email=` – Fetch allergens
- `POST /api/allergens` – Add allergen
- `DELETE /api/allergens/:id` – Remove allergen by ID

- `GET /api/mealPlanner?email=` – Fetch meal plans
- `POST /api/mealPlanner` – Save meal plan

- `GET /api/profile?email=` – Fetch user profile
- `POST /api/profile` – Upsert user profile

- `GET /api/hasdetails?email=` – Check if user has profile info

- `POST /api/scanfood` – Upload image for scanning
- `POST /api/uploadImage` – Upload image manually

- `POST /api/foodlog` – Log a meal with nutrition info
- `GET /api/foodlog?email=` – Get user's food log

- `GET /api/weeklycalo?email=` – Get calories/macros summary by weekday

## 🧠 Developer Notes

- All MongoDB collections are filtered by `email` to ensure user-specific data access.
- Profile collection enforces unique emails via index.
- Timestamps are automatically attached to food logs.
- Upload endpoints return direct URLs for frontend usage.

---

Made with ❤️ for the NutriTrack app.

