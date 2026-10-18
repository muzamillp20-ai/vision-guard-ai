import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  BarChart3,
  Camera,
  Activity,
  Settings,
  Shield,
  Bell,
  ScrollText,
  Users,
  LogOut,
} from 'lucide-react';
import TopBar from './components/TopBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import MonitoringPage from './pages/MonitoringPage';
import IncidentsPage from './pages/IncidentsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SourcesPage from './pages/SourcesPage';
import HealthPage from './pages/HealthPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogPage from './pages/AuditLogPage';
import NotificationsPage from './pages/NotificationsPage';
import UserManagementPage from './pages/UserManagementPage';
import { Loader2 } from 'lucide-react';
import type { UserRole } from './types/auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', roles: ['admin', 'operator', 'viewer'] as UserRole[] },
  { to: '/monitoring', icon: Video, label: 'Live Monitoring', roles: ['admin', 'operator'] as UserRole[] },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents', roles: ['admin', 'operator', 'viewer'] as UserRole[] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'operator', 'viewer'] as UserRole[] },
  { to: '/sources', icon: Camera, label: 'Sources & Zones', roles: ['admin', 'operator'] as UserRole[] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'operator', 'viewer'] as UserRole[] },
  { to: '/audit', icon: ScrollText, label: 'Audit Log', roles: ['admin'] as UserRole[] },
  { to: '/health', icon: Activity, label: 'System Health', roles: ['admin', 'operator'] as UserRole[] },
  { to: '/users', icon: Users, label: 'User Management', roles: ['admin'] as UserRole[] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] as UserRole[] },
];

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-blue-700 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function Sidebar() {
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-gray-200">
        <Shield className="w-5 h-5 text-blue-700 mr-2" />
        <span className="font-semibold text-sm text-gray-900 tracking-tight">VisionGuard AI</span>
      </div>
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar systemOnline={true} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'viewer']}><OverviewPage /></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><MonitoringPage /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'viewer']}><IncidentsPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'viewer']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/sources" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><SourcesPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute allowedRoles={['admin', 'operator', 'viewer']}><NotificationsPage /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogPage /></ProtectedRoute>} />
            <Route path="/health" element={<ProtectedRoute allowedRoles={['admin', 'operator']}><HealthPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-700 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading VisionGuard AI…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
