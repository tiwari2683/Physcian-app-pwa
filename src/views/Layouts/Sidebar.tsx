import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, FileText, Menu, ClipboardList, Settings } from 'lucide-react';
import { useAppSelector } from '../../controllers/hooks/hooks';

interface SidebarProps {
  expanded: boolean;
  onToggleExpand: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar = ({
  expanded,
  onToggleExpand,
  mobileOpen,
  onMobileClose
}: SidebarProps) => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || 'Doctor';
  const rolePath = `/${role.toLowerCase()}`;

  // Doctor-specific links
  const doctorNavItems = [
    { name: 'Dashboard', path: `${rolePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Patients', path: `${rolePath}/patients`, icon: Users },
    { name: 'Appointments', path: `${rolePath}/appointments`, icon: CalendarDays },
    { name: 'Fitness Certificate', path: `${rolePath}/fitness-certificate`, icon: FileText },
    { name: 'Prescriptions', path: `${rolePath}/prescriptions`, icon: ClipboardList },
    { name: 'Settings', path: `${rolePath}/settings`, icon: Settings },
  ];

  // Assistant-specific links (Matches current PWA features available to assistants)
  const assistantNavItems = [
    { name: 'Dashboard', path: `${rolePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Appointments', path: `${rolePath}/appointments`, icon: CalendarDays },
    { name: 'Patients', path: `${rolePath}/patients`, icon: Users },
    { name: 'Settings', path: `${rolePath}/settings`, icon: Settings },
  ];

  const navItems = role === 'Doctor' ? doctorNavItems : assistantNavItems;

  const sidebarClass = [
    'sidebar',
    expanded ? 'expanded' : '',
    mobileOpen ? 'mobile-open' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={onMobileClose}
      />

      <aside className={sidebarClass}>

        {/* Hamburger toggle — desktop expand/collapse, mobile drawer open */}
        <div className="sidebar-brand">
          <button
            className="sidebar-hamburger"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="sidebar-brand-icon" />
          </button>
          <span className="sidebar-brand-text">
            Physician App
          </span>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                data-tooltip={item.name}
                onClick={onMobileClose}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon />
                <span className="sidebar-item-label">{item.name}</span>
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
};
