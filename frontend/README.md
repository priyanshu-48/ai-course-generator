# AI Course Generator - Frontend

React frontend application with Tailwind CSS for the AI Course Generator platform.

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── ProtectedRoute.jsx
│   │   └── Sidebar.jsx
│   ├── context/          # React context providers
│   │   └── AuthContext.jsx
│   ├── pages/            # Page components
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AddCourse.jsx
│   │   ├── CoursePage.jsx
│   │   ├── Explore.jsx
│   │   └── Upgrade.jsx
│   ├── utils/            # Utility functions
│   │   └── api.js
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Features

### Authentication
- User registration with email and password
- JWT-based login with token refresh
- Persistent authentication across page reloads
- Protected routes for authenticated users

### Dashboard
- Grid view of all user courses
- Progress tracking for each course
- Course creation and deletion
- Visual progress bars

### Course Generation
- AI-powered course creation using Google Gemini
- Category selection
- Custom descriptions for targeted content
- Real-time generation feedback

### Course Learning
- Module-based course structure
- Embedded YouTube videos
- AI-generated explanations
- Progress tracking per subtopic
- Mark lessons as complete
- Sidebar navigation through modules

### User Management
- Plan-based course limits
- Visual course quota tracking
- Upgrade page with pricing tiers

## Technologies

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **Context API** - State management

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Add environment variable: `VITE_API_URL=<your-backend-url>`
5. Deploy!

### Manual Build

```bash
npm run build
```

Deploy the `dist/` directory to any static hosting service.

## Development Tips

- The app uses JWT tokens stored in localStorage
- Token refresh is automatic via axios interceptors
- All API calls are centralized in `src/utils/api.js`
- Authentication state is managed via Context API
- Protected routes redirect to login if not authenticated




