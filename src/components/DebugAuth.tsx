// src/components/DebugAuth.tsx
import React from 'react';
import { useAppSelector } from '../controllers/hooks/hooks'; // Adjusted path

export const DebugAuth: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);

  return (
    <pre
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        background: 'rgba(0,0,0,0.85)',
        color: '#0f0',
        padding: '0.5rem',
        fontSize: '0.85rem',
        maxWidth: '30rem',
        overflow: 'auto',
        zIndex: 9999,
        pointerEvents: 'none',
        borderTopLeftRadius: '8px'
      }}
    >
      {user ? JSON.stringify(user, null, 2) : 'No user logged in'}
    </pre>
  );
};
