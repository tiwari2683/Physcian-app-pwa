import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // On mobile the hamburger inside sidebar should open the drawer
  // On desktop it should toggle expanded/collapsed
  const handleSidebarToggle = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarExpanded(prev => !prev);
    }
  };

  return (
    <div className="app-shell flex overflow-hidden">
      <Sidebar 
          expanded={sidebarExpanded}
          onToggleExpand={handleSidebarToggle}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="main-area flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="content-zone flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
