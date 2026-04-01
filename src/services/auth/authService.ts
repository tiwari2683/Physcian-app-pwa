// src/services/auth/authService.ts
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { userPool } from './cognitoConfig';

// Module-level reference to the CognitoUser pending a NEW_PASSWORD_REQUIRED challenge.
// Stored here (not in React state) so it survives navigation between screens.
let _pendingCognitoUser: CognitoUser | null = null;

// Discriminated union: a login can result in a valid token OR a "must change password" challenge
export type LoginResult =
  | { type: 'SUCCESS'; token: string }
  | { type: 'NEW_PASSWORD_REQUIRED' };

export const authService = {
  login: (email: string, password: string): Promise<LoginResult> => {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const idToken = result.getIdToken();
          const tokenStr = idToken.getJwtToken();
          const payload = idToken.decodePayload();

          // Strict Role Enforcement: must be a Doctor
          const role = payload['custom:role'];
          if (!role) {
            cognitoUser.signOut();
            reject(new Error('Access Denied: Role attribute missing. Please ask your administrator to grant "custom:role" read permission in Cognito App Client settings.'));
            return;
          }
          if (role !== 'Doctor') {
            cognitoUser.signOut();
            reject(new Error('Access Denied: You must be a Doctor to log into this portal.'));
            return;
          }

          _pendingCognitoUser = null; // clear any stale pending user
          resolve({ type: 'SUCCESS', token: tokenStr });
        },
        onFailure: (err) => {
          reject(err);
        },
        // Fires on first-time login when Cognito assigned a temporary password
        newPasswordRequired: (_userAttributes, _requiredAttributes) => {
          // Store at module level — survives React component unmount/remount during navigation
          _pendingCognitoUser = cognitoUser;
          resolve({ type: 'NEW_PASSWORD_REQUIRED' });
        },
      });
    });
  },

  // Called from ForceChangePasswordScreen after user enters their new permanent password
  completeNewPassword: (newPassword: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!_pendingCognitoUser) {
        reject(new Error('No active challenge. Please log in again.'));
        return;
      }

      const cognitoUser = _pendingCognitoUser;

      cognitoUser.completeNewPasswordChallenge(
        newPassword,
        {}, // no additional required attributes
        {
          onSuccess: (result) => {
            const idToken = result.getIdToken();
            const payload = idToken.decodePayload();

            // Re-enforce role after password change
            const role = payload['custom:role'];
            if (!role) {
              cognitoUser.signOut();
              _pendingCognitoUser = null;
              reject(new Error('Access Denied: Role attribute missing. Current user has no role defined or App Client lacks "custom:role" read permission.'));
              return;
            }
            if (role !== 'Doctor') {
              cognitoUser.signOut();
              _pendingCognitoUser = null;
              reject(new Error('Access Denied: You must be a Doctor to log into this portal.'));
              return;
            }

            _pendingCognitoUser = null; // challenge complete
            resolve(idToken.getJwtToken());
          },
          onFailure: (err) => {
            reject(err);
          },
        }
      );
    });
  },

  getCurrentSessionToken: (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) {
        reject(new Error('No current user found'));
        return;
      }

      cognitoUser.getSession((err: Error | null, session: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (session && session.isValid()) {
          const idToken = session.getIdToken();
          const payload = idToken.decodePayload();

          // Double-check role on session resume
          if (payload['custom:role'] !== 'Doctor') {
            cognitoUser.signOut();
            reject(new Error('Access Denied: Doctor role required.'));
            return;
          }

          resolve(idToken.getJwtToken());
        } else {
          reject(new Error('Session invalid'));
        }
      });
    });
  },

  forgotPassword: (email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err),
      });
    });
  },

  confirmForgotPassword: (email: string, code: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err),
      });
    });
  },

  changePassword: (oldPassword: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) {
        reject(new Error('No current user found'));
        return;
      }

      cognitoUser.getSession((err: Error | null, session: any) => {
        if (err || !session || !session.isValid()) {
          reject(new Error('Session invalid, please log in again'));
          return;
        }

        cognitoUser.changePassword(oldPassword, newPassword, (changeErr) => {
          if (changeErr) {
            reject(changeErr);
            return;
          }
          resolve();
        });
      });
    });
  },

  logout: () => {
    _pendingCognitoUser = null;
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
  },
};