import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './controllers/store';
// import { DebugAuth } from './components/DebugAuth';
import { AppRouter } from './routes/AppRouter';
import { useAuth } from './controllers/hooks/useAuth';

import { Toaster } from 'react-hot-toast';

// Wrapper to initialize auth check inside the Redux Provider context
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { checkSession } = useAuth();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return <>{children}</>;
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
