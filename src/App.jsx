import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Auth
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Student
import StudentDashboard from './pages/student/StudentDashboard'
import StudentShop from './pages/student/StudentShop'
import StudentTests from './pages/student/StudentTests'
import StudentQR from './pages/student/StudentQR'
import StudentProfile from './pages/student/StudentProfile'
import StudentCourses from './pages/student/StudentCourses'
import StudentHistory from './pages/student/StudentHistory'

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherAssignPoints from './pages/teacher/TeacherAssignPoints'
import TeacherTests from './pages/teacher/TeacherTests'
import TeacherShop from './pages/teacher/TeacherShop'
import TeacherRanking from './pages/teacher/TeacherRanking'
import TeacherCourses from './pages/teacher/TeacherCourses'
import TeacherHistory from './pages/teacher/TeacherHistory'
import TeacherCourseDetail from './pages/teacher/TeacherCourseDetail'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function RoleRouter() {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'admin') return <Navigate to="/admin" replace />
  if (profile.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #6C3AF7 0%, #2D0EA3 100%)',
      gap: 16
    }}>
      <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s ease infinite' }}>💜</div>
      <div style={{ color: 'white', fontFamily: 'Sora', fontWeight: 700, fontSize: '1.2rem' }}>
        FF Wallet
      </div>
      <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/shop" element={<ProtectedRoute roles={['student']}><StudentShop /></ProtectedRoute>} />
          <Route path="/student/tests" element={<ProtectedRoute roles={['student']}><StudentTests /></ProtectedRoute>} />
          <Route path="/student/qr" element={<ProtectedRoute roles={['student']}><StudentQR /></ProtectedRoute>} />
          <Route path="/student/history" element={<ProtectedRoute roles={['student']}><StudentHistory /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute roles={['student']}><StudentCourses /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><StudentProfile /></ProtectedRoute>} />

          {/* Teacher Routes */}
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/assign" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherAssignPoints /></ProtectedRoute>} />
          <Route path="/teacher/tests" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherTests /></ProtectedRoute>} />
          <Route path="/teacher/shop" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherShop /></ProtectedRoute>} />
          <Route path="/teacher/history" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherHistory /></ProtectedRoute>} />
          <Route path="/teacher/courses" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherCourses /></ProtectedRoute>} />
          <Route path="/teacher/courses/:id" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherCourseDetail /></ProtectedRoute>} />
          <Route path="/teacher/ranking" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherRanking /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}