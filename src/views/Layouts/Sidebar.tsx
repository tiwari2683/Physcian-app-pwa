import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, FileText, Menu } from 'lucide-react';

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

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Appointments', path: '/appointments', icon: CalendarDays },
    { name: 'Fitness Certificate', path: '/fitness-certificate', icon: FileText },
  ];

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
