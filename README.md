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


## 🎓 Learning Resources

Built as a comprehensive full-stack project demonstrating:
- Django REST API development
- React SPA architecture
- MongoDB integration
- AI API integration
- JWT authentication
- Modern UI/UX design





