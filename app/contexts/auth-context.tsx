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
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { API_BASE_URL } from "@/utils/config";

// Storage keys
const AUTH_STORAGE_KEY = "tabbit.auth";
const TOKEN_STORAGE_KEY = "tabbit.token";

// Google OAuth configuration
const GOOGLE_IOS_CLIENT_ID =
  "1007672962218-o67io1st4gnevkinaqo4cdeo38ergoh4.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID =
  "1007672962218-fv05df92ij6i74bahnfg3gkmgril1ol1.apps.googleusercontent.com";

// HTTP headers
const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Type guard to check if error has a code property matching Google Sign-In status codes
 */
const isGoogleError = (error: unknown): error is { code: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
};

/**
 * Maps Google Sign-In error codes to user-friendly error messages
 */
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  [statusCodes.SIGN_IN_CANCELLED]: "Sign in was cancelled",
  [statusCodes.IN_PROGRESS]: "Sign in is already in progress",
  [statusCodes.PLAY_SERVICES_NOT_AVAILABLE]:
    "Google Play Services not available",
};

/**
 * Handles Google Sign-In errors and throws appropriate error messages
 */
const handleGoogleError = (error: unknown): never => {
  if (isGoogleError(error) && error.code in GOOGLE_ERROR_MESSAGES) {
    throw new Error(GOOGLE_ERROR_MESSAGES[error.code]);
  }
  throw error;
};

/**
 * Normalizes user data from API response, ensuring name field is always present
 */
const normalizeUserData = (user: User, fallbackName = ""): User => ({
  ...user,
  name: user.name || fallbackName,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Verifies the validity of an authentication token with the backend
   * @returns true if token is valid, false if invalid, true on network errors (optimistic)
   */
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...JSON_HEADERS,
        },
      });

      if (response.status === 401 || response.status === 403) {
        return false;
      }

      if (response.ok) {
        const data = await response.json();
        return data.success === true && !!data.user;
      }

      // Optimistic: assume valid on unknown errors
      return true;
    } catch (error) {
      console.warn("Token verification network error:", error);
      // Optimistic: assume valid on network errors
      return true;
    }
  }, []);

  /**
   * Clears all authentication data from storage and state
   */
  const clearAuthStorage = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
    setUser(null);
  }, []);

  /**
   * Loads authentication state from storage and verifies token validity
   * Migrates token from AsyncStorage to SecureStore if needed
   */
  const loadAuthState = useCallback(async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      let token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);

      // Migrate token from AsyncStorage to SecureStore if needed
      if (!token) {
        const oldToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (oldToken) {
          await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, oldToken);
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          token = oldToken;
        }
      }

      if (stored && token) {
        const userData = JSON.parse(stored) as User;
        setUser(userData);

        const isValid = await verifyToken(token);
        if (!isValid) {
          await clearAuthStorage();
        }
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
      await clearAuthStorage();
    } finally {
      setIsLoading(false);
    }
  }, [verifyToken, clearAuthStorage]);

  // Initialize Google Sign-In configuration
  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  /**
   * Stores authentication token and user data securely
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
   * Handles authentication API response and extracts token and user data
   * @throws Error if response is invalid or missing required data
   */
  const handleAuthResponse = useCallback(
    async (
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
        image: data.user.image || null,
      };

      return { token, user: userData };
    },
    []
  );

  /**
   * Signs in user with email and password
   */
  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    });

    const { token, user } = await handleAuthResponse(
      response,
      "Sign in failed"
    );
    await storeAuthData(token, user);
  };

  /**
   * Signs up new user with email, password, and name
   */
  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password, name }),
    });

    const { token, user: baseUser } = await handleAuthResponse(
      response,
      "Sign up failed"
    );

    await storeAuthData(token, normalizeUserData(baseUser, name));
  };

  /**
   * Signs out the current user and clears all auth data
   */
  const signOut = async (): Promise<void> => {
    await clearAuthStorage();
  };

  /**
   * Signs in user with Google OAuth
   */
  const signInWithGoogle = async (): Promise<void> => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.user) {
        throw new Error("No user data received from Google Sign-In");
      }

      const { user, idToken, serverAuthCode } = userInfo.data;

      if (!user.email || !user.id) {
        throw new Error("Missing required user information from Google");
      }

      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken || idToken || "";

      const backendResponse = await fetch(
        `${API_BASE_URL}/auth/google/callback`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            email: user.email,
            name: user.name || user.email.split("@")[0],
            googleId: user.id,
            accessToken,
            idToken: idToken || undefined,
            serverAuthCode: serverAuthCode || undefined,
          }),
        }
      );

      const { token, user: baseUser } = await handleAuthResponse(
        backendResponse,
        "Google sign in failed"
      );

      await storeAuthData(token, normalizeUserData(baseUser, user.name || ""));
    } catch (error: unknown) {
      console.error("Error signing in with Google:", error);
      handleGoogleError(error);
    }
  };

  /**
   * Signs in user with Apple (not yet implemented)
   */
  const signInWithApple = async (): Promise<void> => {
    throw new Error("Sign in with Apple is not yet implemented");
  };

  /**
   * Clears authentication state (alias for clearAuthStorage)
   */
  const clearAuthState = async (): Promise<void> => {
    await clearAuthStorage();
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...JSON_HEADERS,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const userData: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || "",
            image: data.user.image || null,
          };
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
          setUser(userData);
        }
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  }, []);

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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
