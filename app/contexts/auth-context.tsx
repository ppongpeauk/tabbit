/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication context with secure token storage
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { API_BASE_URL } from "@/utils/config";

// Complete the auth session to close the browser
// WebBrowser.maybeCompleteAuthSession();

const AUTH_STORAGE_KEY = "tabbit.auth";
const TOKEN_STORAGE_KEY = "tabbit.token";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Verifies the token with the backend
   * @param token - The authentication token to verify
   * @returns true if token is valid, false if invalid, true on network errors (to preserve state)
   */
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Token is definitively invalid
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      // Verify response format
      if (response.ok) {
        const data = await response.json();
        return data.success === true && !!data.user;
      }

      // For other HTTP errors, assume token might still be valid (server issue)
      return true;
    } catch (error) {
      // Network errors shouldn't clear auth state - token will be verified on next API call
      console.warn(
        "Token verification network error (keeping auth state):",
        error
      );
      return true;
    }
  }, []);

  /**
   * Clears all authentication data from storage
   */
  const clearAuthStorage = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
    setUser(null);
  }, []);

  /**
   * Loads authentication state from storage and verifies token
   */
  const loadAuthState = useCallback(async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      let token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);

      // Migrate from AsyncStorage to SecureStore if needed
      if (!token) {
        const oldToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (oldToken) {
          await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, oldToken);
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          token = oldToken;
        }
      }

      if (stored && token) {
        // Set user immediately from stored data for faster UI
        const userData = JSON.parse(stored);
        setUser(userData);

        // Verify token is still valid
        const isValid = await verifyToken(token);
        if (!isValid) {
          await clearAuthStorage();
        }
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
      // Clear potentially corrupted data
      await clearAuthStorage();
    } finally {
      setIsLoading(false);
    }
  }, [verifyToken, clearAuthStorage]);

  // Configure Google Sign-In
  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        GoogleSignin.configure({
          iosClientId:
            "1007672962218-o67io1st4gnevkinaqo4cdeo38ergoh4.apps.googleusercontent.com",
          webClientId:
            "1007672962218-fv05df92ij6i74bahnfg3gkmgril1ol1.apps.googleusercontent.com",
          offlineAccess: true, // Request offline access
        });
      } catch (error) {
        console.error("Failed to configure Google Sign-In:", error);
      }
    };

    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  /**
   * Stores authentication data after successful login
   */
  const storeAuthData = useCallback(
    async (token: string, userData: User): Promise<void> => {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
      setUser(userData);
    },
    []
  );

  /**
   * Handles authentication response and stores data
   */
  const handleAuthResponse = async (
    response: Response,
    errorMessage: string
  ): Promise<{ token: string; user: User }> => {
    const data = await response.json();

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || errorMessage);
    }

    const token = data.token;
    if (!token) {
      throw new Error("No token received from server");
    }

    const userData: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || "",
    };

    return { token, user: userData };
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const { token, user } = await handleAuthResponse(
        response,
        "Sign in failed"
      );
      await storeAuthData(token, user);
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const { token, user: baseUser } = await handleAuthResponse(
        response,
        "Sign up failed"
      );

      // Use provided name if user name is not available
      const userData: User = {
        ...baseUser,
        name: baseUser.name || name,
      };

      await storeAuthData(token, userData);
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await clearAuthStorage();
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      // Check if Google Play Services are available (Android only)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign in with Google - this opens native Google Sign-In UI
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data || !userInfo.data.user) {
        throw new Error("No user data received from Google Sign-In");
      }

      const { user, idToken, serverAuthCode } = userInfo.data;

      if (!user.email || !user.id) {
        throw new Error("Missing required user information from Google");
      }

      // Get access token - for native sign-in, we can get tokens using getTokens()
      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken || idToken || "";

      // Send user info and tokens to backend to create/update user and get session token
      const backendResponse = await fetch(
        `${API_BASE_URL}/auth/google/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name || user.email.split("@")[0],
            googleId: user.id,
            accessToken: accessToken,
            idToken: idToken || undefined,
            serverAuthCode: serverAuthCode || undefined,
          }),
        }
      );

      const { token, user: baseUser } = await handleAuthResponse(
        backendResponse,
        "Google sign in failed"
      );

      const userData: User = {
        ...baseUser,
        name: baseUser.name || user.name || "",
      };

      await storeAuthData(token, userData);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        throw new Error("Sign in was cancelled");
      } else if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === statusCodes.IN_PROGRESS
      ) {
        throw new Error("Sign in is already in progress");
      } else if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        throw new Error("Google Play Services not available");
      }
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signInWithApple = async (): Promise<void> => {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Apple Authentication is not available on this device");
      }

      // Request Apple ID credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send credential to server
      const response = await fetch(`${API_BASE_URL}/auth/apple/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          user: credential.user,
          email: credential.email,
          fullName: credential.fullName
            ? {
                givenName: credential.fullName.givenName,
                familyName: credential.fullName.familyName,
              }
            : null,
        }),
      });

      const { token, user: baseUser } = await handleAuthResponse(
        response,
        "Apple sign in failed"
      );

      const userData: User = {
        ...baseUser,
        name: baseUser.name || credential.fullName?.givenName || "",
      };

      await storeAuthData(token, userData);
    } catch (error) {
      console.error("Error signing in with Apple:", error);
      throw error;
    }
  };

  const clearAuthState = async (): Promise<void> => {
    try {
      await clearAuthStorage();
    } catch (error) {
      console.error("Error clearing auth state:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signOut,
        clearAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
