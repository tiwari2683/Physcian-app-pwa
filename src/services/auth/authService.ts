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
      const role = attributes['custom:role'] as 'SuperAdmin' | 'Doctor' | 'Assistant';
      const tenantId = attributes['custom:tenant_id'];

      // GUARD 1: Must be a valid role
      if (!role || (role !== 'SuperAdmin' && role !== 'Doctor' && role !== 'Assistant')) {
        await signOut();
        throw new Error('Access Denied: Unauthorized role.');
      }

      // GUARD 2: Clinic Staff MUST have a tenant ID (SuperAdmins do not need one)
      if (role !== 'SuperAdmin' && !tenantId) {
        await signOut();
        throw new Error('Access Denied: Your account is not assigned to a registered clinic.');
      }

      const user: User = {
        email: attributes.email || '',
        sub: attributes.sub || '',
        name: attributes.name || attributes.preferred_username || email,
        role: role,
        tenantId: tenantId, // TASK 4: Inject Tenant ID into User object
        jwtToken: idToken
      };

      return { type: 'SUCCESS', user };
    }

    throw new Error('Login failed. Please check your credentials.');
  },

  completeNewPassword: async (newPassword: string): Promise<User> => {
    const { nextStep, isSignedIn } = await confirmSignIn({
      challengeResponse: newPassword
    });

    if (isSignedIn || nextStep.signInStep === 'DONE') {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString() || '';

      const attributes = await fetchUserAttributes();
      const role = attributes['custom:role'] as 'SuperAdmin' | 'Doctor' | 'Assistant';
      const tenantId = attributes['custom:tenant_id'];

      if (!role || (role !== 'SuperAdmin' && role !== 'Doctor' && role !== 'Assistant')) {
        await signOut();
        throw new Error('Access Denied: Unauthorized role.');
      }

      if (role !== 'SuperAdmin' && !tenantId) {
        await signOut();
        throw new Error('Access Denied: Your account is not assigned to a registered clinic.');
      }

      const user: User = {
        email: attributes.email || '',
        sub: attributes.sub || '',
        name: attributes.name || attributes.preferred_username || '',
        role: role,
        tenantId: tenantId, // TASK 4: Inject Tenant ID
        jwtToken: idToken
      };

      return user;
    }

    throw new Error('Failed to complete password change challenge.');
  },

  // ✅ FIXED: Returns the raw JWT string so apiClient can use it directly
  // Previously returned a User object, causing "Bearer [object Object]" to be sent
  getCurrentSessionToken: async (): Promise<string> => {
    const session = await fetchAuthSession();

    if (!session.tokens?.idToken) {
      throw new Error('No active session found.');
    }

    const idToken = session.tokens.idToken.toString();
    return idToken;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await resetPassword({ username: email });
  },

  confirmForgotPassword: async (email: string, code: string, newPassword: string): Promise<void> => {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword: newPassword
    });
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await updatePassword({
      oldPassword,
      newPassword
    });
  },

  logout: async () => {
    await signOut();
  },
};