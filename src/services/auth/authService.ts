// src/services/auth/authService.ts
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { userPool } from './cognitoConfig';

export const authService = {
  login: (email: string, password: string): Promise<string> => {
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
          // We extract the IdToken to send to our API Gateway
          const token = result.getIdToken().getJwtToken();
          resolve(token);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
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
          resolve(session.getIdToken().getJwtToken());
        } else {
          reject(new Error('Session invalid'));
        }
      });
    });
  },

  logout: () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
  },
};
