import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../controllers/hooks/useAuth';
import { useAppSelector } from '../../controllers/hooks/hooks';

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export const Header = ({ onMobileMenuClick }: HeaderProps) => {
  const { logout } = useAuth();
  const { user } = useAppSelector((state) => state.auth);

  return (
    <header className="top-header justify-between z-10">
      <div className="flex items-center gap-4">
        <button
          className="mobile-menu-btn md:hidden"
          onClick={onMobileMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu />
        </button>
        <h2 className="header-title hidden sm:block">
          Welcome, {user?.role === 'Doctor' ? `Dr. ${user?.name || 'Physician'}` : user?.name || 'Staff'}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <div className="bg-blue-100 text-blue-600 rounded-full flex items-center justify-center p-1">
            <UserIcon />
          </div>
          <span className="header-user">{user?.email}</span>
        </div>
        <button 
          onClick={logout}
          className="header-btn text-red-600 hover:text-red-700"
        >
          <LogOut />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
};
