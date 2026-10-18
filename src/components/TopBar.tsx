import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/monitoring': 'Live Monitoring',
  '/incidents': 'Incidents',
  '/analytics': 'Analytics',
  '/sources': 'Sources & Zones',
  '/health': 'System Health',
  '/settings': 'Settings',
};

interface TopBarProps {
  systemOnline: boolean;
}

export default function TopBar({ systemOnline }: TopBarProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'VisionGuard AI';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          {systemOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-700 font-medium">System Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-500">Offline</span>
            </>
          )}
        </div>
        <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center">
          <span className="text-white text-xs font-medium">OP</span>
        </div>
      </div>
    </header>
  );
}
