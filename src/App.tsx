import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './controllers/store';
// import { DebugAuth } from './components/DebugAuth';
import { AppRouter } from './routes/AppRouter';
import { useAuth } from './controllers/hooks/useAuth';
import { SubscriptionExpiredModal } from './components/Common/SubscriptionExpiredModal';
import { SUBSCRIPTION_BLOCKED_EVENT } from './services/subscription/subscriptionAccess';

import { Toaster } from 'react-hot-toast';

// Wrapper to initialize auth check inside the Redux Provider context
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { checkSession } = useAuth();
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subMessage, setSubMessage] = useState(
    'Clinic subscription has expired. Please renew to continue.'
  );

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setSubMessage(
        customEvent.detail?.message || 'Clinic subscription has expired. Please renew to continue.'
      );
      setIsSubModalOpen(true);
    };

    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, handler);
    return () => window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, handler);
  }, []);

  return (
    <>
      {children}
      <SubscriptionExpiredModal
        open={isSubModalOpen}
        message={subMessage}
        onClose={() => setIsSubModalOpen(false)}
      />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <AuthInitializer>
        <Toaster position="top-center" />
        <AppRouter />
        {/* <DebugAuth /> */}
      </AuthInitializer>
    </Provider>
  );
}

export default App;
