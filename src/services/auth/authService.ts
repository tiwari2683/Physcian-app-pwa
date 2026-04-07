import { 
  signIn, 
  signOut, 
  fetchAuthSession, 
  fetchUserAttributes, 
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
  updatePassword
} from 'aws-amplify/auth';
import type { User } from '../../models';

// Discriminated union: a login can result in a valid token OR a "must change password" challenge
export type LoginResult =
  | { type: 'SUCCESS'; user: User }
  | { type: 'NEW_PASSWORD_REQUIRED' };

export const authService = {
  /**
   * Performs login and checks for the "Doctor" or "Assistant" role.
   * If a NEW_PASSWORD_REQUIRED challenge is returned, the success is deferred.
   */
  login: async (email: string, password: string): Promise<LoginResult> => {
    const { nextStep, isSignedIn } = await signIn({
      username: email,
      password: password,
    });

    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return { type: 'NEW_PASSWORD_REQUIRED' };
    }

    if (isSignedIn) {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString() || '';
      
      const attributes = await fetchUserAttributes();
      const role = attributes['custom:role'] as 'Doctor' | 'Assistant';

      if (!role || (role !== 'Doctor' && role !== 'Assistant')) {
        await signOut();
        throw new Error('Access Denied: Unauthorized role. Must be Doctor or Assistant.');
      }

      const user: User = {
        email: attributes.email || '',
        sub: attributes.sub || '',
        name: attributes.name || attributes.preferred_username || email,
        role: role,
        jwtToken: idToken
      };

      return { type: 'SUCCESS', user };
    }

    throw new Error('Login failed. Please check your credentials.');
  },

  /**
   * Completes the "New Password Required" challenge.
   */
  completeNewPassword: async (newPassword: string): Promise<User> => {
    const { nextStep, isSignedIn } = await confirmSignIn({
      challengeResponse: newPassword
    });

    if (isSignedIn || nextStep.signInStep === 'DONE') {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString() || '';
      
      const attributes = await fetchUserAttributes();
      const role = attributes['custom:role'] as 'Doctor' | 'Assistant';

      if (!role || (role !== 'Doctor' && role !== 'Assistant')) {
        await signOut();
        throw new Error('Access Denied: Unauthorized role.');
      }

      const user: User = {
        email: attributes.email || '',
        sub: attributes.sub || '',
        name: attributes.name || attributes.preferred_username || '',
        role: role,
        jwtToken: idToken
      };

      return user;
    }

    throw new Error('Failed to complete password change challenge.');
  },

  /**
   * Retreives the current valid ID token, refreshing it automatically if needed.
   * Also verifies that the user still has an authorized role.
   */
  getCurrentSessionToken: async (): Promise<User> => {
    const session = await fetchAuthSession();
    
    if (!session.tokens?.idToken) {
      throw new Error('No active session found.');
    }

    const attributes = await fetchUserAttributes();
    const idToken = session.tokens.idToken.toString();
    const role = (session.tokens.idToken.payload as any)['custom:role'] as 'Doctor' | 'Assistant';

    if (role !== 'Doctor' && role !== 'Assistant') {
      await signOut();
      throw new Error('Access Denied: Unauthorized role.');
    }

    const user: User = {
        email: attributes.email || '',
        sub: attributes.sub || '',
        name: attributes.name || attributes.preferred_username || '',
        role: role,
        jwtToken: idToken
    };

    return user;
  },

  /**
   * Initiates the forgot password flow (sends code to email).
   */
  forgotPassword: async (email: string): Promise<void> => {
    await resetPassword({ username: email });
  },

  /**
   * Confirms the new password using the code sent via email.
   */
  confirmForgotPassword: async (email: string, code: string, newPassword: string): Promise<void> => {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword: newPassword
    });
  },

  /**
   * Changes the password for the currently logged-in user.
   */
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await updatePassword({
      oldPassword,
      newPassword
    });
  },

  /**
   * Signs out the user globally.
   */
  logout: async () => {
    await signOut();
  },
};