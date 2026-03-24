import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './controllers/store';
import { AppRouter } from './routes/AppRouter';
import { useAuth } from './controllers/hooks/useAuth';

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
        <AppRouter />
      </AuthInitializer>
    </Provider>
  );
}

export default App;
