# AI Course Generator 🎓

A production-grade, full-stack web application that uses Google Gemini 2.5 Pro AI to automatically generate comprehensive, structured learning courses on any topic.

## 🌟 Features

- **AI-Powered Course Generation**: Leverage Google Gemini AI to create detailed course roadmaps with modules, subtopics, and content
- **Authentication System**: Secure JWT-based authentication with user registration and login
- **Progress Tracking**: Track your learning progress with visual indicators and completion markers
- **Video Integration**: Curated YouTube videos embedded for each lesson
- **Plan-Based Limits**: Free tier with 3 courses, upgradeable plans for unlimited courses
- **Modern UI**: Clean, responsive design built with Tailwind CSS
- **MongoDB Storage**: All courses and progress saved to cloud database

## 🏗️ Architecture

### Backend (Django + DRF)
- RESTful API with Django REST Framework
- JWT authentication with SimpleJWT
- MongoDB integration via djongo
- Google Gemini AI API integration
- User and course management

### Frontend (React + Vite)
- Modern React 18 with Vite
- Tailwind CSS for styling
- React Router for navigation
- Axios for API communication
- Context API for state management

## 📁 Project Structure

```
ai-course-generator/
├── backend/
│   ├── core/              # Django project settings
│   ├── users/             # User authentication app
│   ├── courses/           # Course management app
│   ├── utils/             # Utility services (Gemini AI)
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── utils/         # API utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB Atlas account (free tier)
- Google Gemini API key (free tier)

### Backend Setup

1. **Create virtual environment**:
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Configure environment variables**:

Create `backend/.env`:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_course_generator?retryWrites=true&w=majority
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=http://localhost:5173
```

4. **Get API Keys**:

**MongoDB Atlas**:
- Go to https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get your connection string

**Google Gemini API**:
- Go to https://makersuite.google.com/app/apikey
- Create an API key

5. **Run migrations**:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. **Start backend server**:
```bash
python manage.py runserver
```

Backend will run at `http://localhost:8000`

### Frontend Setup

1. **Install dependencies**:
```bash
cd frontend
npm install
```

2. **Configure environment**:

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

3. **Start development server**:
```bash
npm run dev
```

Frontend will run at `http://localhost:5173`

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Create Course**: Click "Add Course" and fill in:
   - Course title
   - Category
   - Description (be specific for better AI results)
3. **Wait for Generation**: AI generates course structure (10-30 seconds)
4. **Start Learning**: Navigate through modules and lessons
5. **Track Progress**: Mark lessons complete and see your progress

## 🎨 Features Walkthrough

### Landing Page
- Hero section with call-to-action
- Feature highlights
- Redirects authenticated users to dashboard

### Dashboard
- Grid view of all your courses
- Progress visualization
- Quick access to course content
- Course deletion

### Course Page
- Module sidebar for navigation
- Embedded YouTube videos
- AI-generated explanations
- Completion tracking
- Progress percentage

### Add Course
- Simple form for course details
- AI generation with loading states
- Error handling for limits

## 🔒 Security Features

- JWT token authentication
- Automatic token refresh
- Protected API endpoints
- Secure password hashing
- CORS configuration
- Environment variable protection

## 🎯 API Endpoints

### Authentication
- `POST /api/users/register/` - Register user
- `POST /api/users/login/` - Login user
- `POST /api/users/logout/` - Logout user
- `GET /api/users/profile/` - Get user profile

### Courses
- `GET /api/courses/` - List courses
- `POST /api/courses/create/` - Create course (AI generation)
- `GET /api/courses/<id>/` - Get course details
- `DELETE /api/courses/<id>/` - Delete course
- `POST /api/courses/<id>/progress/` - Update progress
- `POST /api/courses/subtopics/<id>/toggle/` - Toggle completion

## 🌐 Deployment

### Backend (Railway/Render)

1. Push code to GitHub
2. Connect to Railway/Render
3. Set environment variables
4. Deploy!

### Frontend (Vercel)

1. Push code to GitHub
2. Import to Vercel
3. Set `VITE_API_URL` environment variable
4. Deploy!

### Database (MongoDB Atlas)

Already cloud-hosted! Just use the connection string.

## 🛠️ Tech Stack

### Backend
- Django 4.2
- Django REST Framework
- MongoDB (djongo)
- JWT (SimpleJWT)
- Google Generative AI
- CORS Headers

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

## 📝 Development Guidelines

- Follow Django best practices
- Use REST API conventions
- Implement error handling
- Write clean, commented code
- Test authentication flows
- Validate user inputs
- Handle loading states

## 🤝 Contributing

This is a production-ready educational project. Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - feel free to use for learning and commercial projects.

## 🎓 Learning Resources

Built as a comprehensive full-stack project demonstrating:
- Django REST API development
- React SPA architecture
- MongoDB integration
- AI API integration
- JWT authentication
- Modern UI/UX design

## 🐛 Troubleshooting

**MongoDB Connection Issues**:
- Verify connection string
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**Gemini API Errors**:
- Verify API key is valid
- Check API quota/limits
- Review prompt formatting

**CORS Errors**:
- Ensure frontend URL is in `CORS_ALLOWED_ORIGINS`
- Check backend is running
- Verify API URL in frontend .env

## 📧 Support

For issues or questions:
1. Check the README thoroughly
2. Review error logs
3. Verify environment variables
4. Test API endpoints individually

---

**Happy Learning! 🚀**




