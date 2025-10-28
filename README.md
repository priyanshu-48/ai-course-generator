# AI Course Generator

An AI-powered web application that generates structured learning courses from a simple topic description.  
It leverages Google Gemini for curriculum generation, YouTube integration for relevant videos, and a progress-tracking dashboard for learners.

---

## Overview

The **AI Course Generator** transforms a user’s idea into a structured, multi-module learning course.  
Users can enter a topic, and the system automatically generates modules, subtopics, and video references — creating a personalized self-learning experience.

### Key Features
- **AI-Powered Course Generation** – Automatically generate a structured course from a short topic or description.
- **YouTube Video Enrichment** – Dynamically fetches and embeds relevant videos for each subtopic.
- **Progress Tracking** – Mark subtopics as complete and visualize learning progress.
- **Demo Mode** – Instantly try the app without login; anonymous sessions are tracked via browser-generated IDs.
- **JWT Authentication** – Secure login and token-based session handling for registered users.

---

## System Architecture

The project is built as a **three-tier full-stack system**:

### 1. Frontend (React + Vite)
- Single-page application for course generation and viewing.
- AuthContext manages user sessions and demo mode.
- Axios client handles authenticated API requests with token refresh.
- Modern component-based UI built with Tailwind CSS.

### 2. Backend (Django REST Framework)
- Exposes REST APIs for user auth, course generation, progress tracking, and course retrieval.
- Integrates with Google Gemini for AI-generated course content.
- Communicates with YouTube Data API to resolve video URLs.
- Uses Redis for caching YouTube search results and improving response time.

### 3. Database Layer
- **MongoDB (via MongoEngine)** – Stores course documents as nested structures (Course → Modules → Subtopics).
- **Relational Database (Django default)** – Handles user data and authentication.
- The hybrid model combines the flexibility of NoSQL with Django’s robust relational features.

---

##  Data Flow

1. **User Input**  
   The user enters a topic and submits it through the React frontend.

2. **AI Generation**  
   The backend sends a structured prompt to Gemini and receives a JSON response with modules and subtopics.

3. **Video Enrichment**  
   Each subtopic containing `search:` keywords is passed through a YouTube search and cached in Redis.

4. **Storage**  
   The fully formed course document is saved to MongoDB.

5. **Frontend Display**  
   The React dashboard fetches the structured data and renders the complete course view with progress indicators.

6. **Progress Tracking**  
   When users mark subtopics as complete, the backend updates the MongoDB document and recalculates completion percentages.

---

## Tech Stack

|         Layer         |            Technology          |                   Purpose                      |
|-----------------------|--------------------------------|------------------------------------------------|
| **Frontend**          | React + Vite + Tailwind CSS    | SPA UI, state management, responsive dashboard |
| **Backend**           | Django + Django REST Framework | API endpoints, auth, and orchestration         |
| **AI Integration**    | Google Gemini API              | Course content generation                      |
| **Cache**             | Redis                          | Caching YouTube video lookups                  |
| **Database**          | MongoDB (via MongoEngine)      | Hierarchical course content storage            |
| **Auth**              | JWT (SimpleJWT)                | Secure token-based user authentication         |
| **Deployment**        | Docker + Gunicorn              | Containerized and scalable deployment          |

---

## Setup Instructions

### Prerequisites
- Node.js (>=18)
- Python (>=3.10)
- MongoDB
- Redis (optional but recommended)
- Google Gemini API key
- YouTube Data API key

### 1. Clone the repository
bash
git clone https://github.com/priyanshu-48/ai-course-generator.git
cd ai-course-generator

---

### 2. Backend Setup

cd backend
pip install -r requirements.txt
cp .env.example .env  # add API keys and Mongo URI
python manage.py migrate
python manage.py runserver

### 3. Frontend Setup
cd frontend
npm install
npm run dev
The app will be available at http://localhost:5173

## Environment Variables

The following variables must be set in .env:

Variable	            |Description                      |
---------------------|---------------------------------|
GEMINI_API_KEY	      |Google Gemini API key            |
YOUTUBE_API_KEY	   |YouTube Data API key             |
MONGODB_URI	         |Connection string for MongoDB    |
REDIS_URL	         |Redis connection URL (optional)  |
SECRET_KEY	         |Django secret key                |

## Design Decisions

   - Hybrid storage: MongoDB for hierarchical course content and Django ORM for user data provide both flexibility and reliability.
   - Structured AI integration: The Gemini service enforces strict JSON output to ensure predictable parsing.
   - Caching layer: Redis prevents redundant API calls, improving response times and reducing costs.
   - Demo mode isolation: Each browser gets a unique demo ID, enabling anonymous exploration without shared state.

## Scalability Considerations

   - Move AI generation to background jobs using Celery/RQ for better concurrency.
   - Use CDN and HTTP caching for static assets and course reads.
   - Introduce API rate limiting and request throttling for generation endpoints.
   - Migrate to managed MongoDB clusters with proper indexing on user_id and created_at.
   - Horizontal scaling of Django API workers behind a load balancer.

## Future Improvements

   - Asynchronous task queue for AI generation.
   - WebSocket or long-polling for progress updates.
   - Enhanced course analytics and recommendations.
   - Role-based accounts (students/instructors).
   - Integration with other content sources (e.g., PDFs, articles).

## License

This project is released under the MIT License.
You are free to use, modify, and distribute this software with attribution.