import { Menu, LogOut, User as UserIcon, Clock, ShieldOff, Building2 } from 'lucide-react';
import { useAuth } from '../../controllers/hooks/useAuth';
import { useAppSelector } from '../../controllers/hooks/hooks';
import { useSubscription } from '../../controllers/hooks/useSubscription';

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export const Header = ({ onMobileMenuClick }: HeaderProps) => {
  const { logout } = useAuth();
  const { user } = useAppSelector((state) => state.auth);
  const { clinicName, daysLeft, isExpired, isExpiringSoon, expiryDateLabel } = useSubscription();
  const isDoctor = user?.role === 'Doctor';

  // Badge style based on subscription health
  const badgeStyle = isExpired
    ? 'bg-red-100 text-red-700 border-red-200 shadow-sm shadow-red-50'
    : isExpiringSoon
      ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-50'
      : 'bg-emerald-50 text-emerald-700 border-emerald-100';

  const BadgeIcon = isExpired ? ShieldOff : Clock;

  return (
    <header className="top-header justify-between z-10">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          className="mobile-menu-btn md:hidden"
          onClick={onMobileMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu />
        </button>
        
        <div className="flex items-center gap-2 min-w-0">
          {clinicName && <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />}
          <h2 className="header-title truncate font-bold text-gray-900">
            {clinicName || 'Physician App'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Subscription badge — moved to the right side */}
        {isDoctor && expiryDateLabel && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-xs font-bold leading-none transition-all ${badgeStyle}`}
            title={isExpired ? 'Subscription expired' : `Subscription valid until ${expiryDateLabel}`}
          >
            <BadgeIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {isExpired
                ? 'Expired'
                : isExpiringSoon
                  ? `Expires in ${daysLeft}d`
                  : `Valid till ${expiryDateLabel}`}
            </span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 font-medium text-gray-700">
          <div className="bg-blue-100 text-blue-600 rounded-full flex items-center justify-center p-1">
            <UserIcon size={18} />
          </div>
          <span className="header-user text-sm">{user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="header-btn text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
};
