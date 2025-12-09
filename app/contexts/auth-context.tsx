/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication context with secure token storage
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/utils/config";

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
  signOut: () => Promise<void>;
  clearAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      // Try secure store first, fallback to AsyncStorage for migration
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

        // Verify token is still valid by checking with backend
        const isValid = await verifyToken(token);
        if (!isValid) {
          // Token invalid, clear storage and user state
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
      // Clear potentially corrupted data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {
        // Ignore errors if key doesn't exist
      });
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      console.log("Verifying token, length:", token?.length);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Token verification response status:", response.status);

      // If we get 401 or 403, token is definitively invalid
      if (response.status === 401 || response.status === 403) {
        const errorText = await response.text().catch(() => "");
        console.log("Token verification failed: Unauthorized", errorText);
        return false;
      }

      // If response is ok, verify the data
      if (response.ok) {
        const data = await response.json();
        const isValid = data.success === true && !!data.user;
        if (!isValid) {
          console.log(
            "Token verification failed: Invalid response format",
            data
          );
        } else {
          console.log("Token verification successful");
        }
        return isValid;
      }

      // For other HTTP errors, assume token might still be valid (could be server issue)
      // Don't clear auth state on temporary server errors
      const errorText = await response.text().catch(() => "");
      console.warn(
        "Token verification returned non-auth error:",
        response.status,
        errorText
      );
      return true;
    } catch (error) {
      // Network errors shouldn't clear auth state - assume token is still valid
      // The token will be verified on the next API call anyway
      console.warn(
        "Token verification network error (keeping auth state):",
        error
      );
      return true;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || "Sign in failed");
      }

      // Extract token from response
      const token = data.token;
      if (!token) {
        throw new Error("No token received from server");
      }

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || "",
      };

      // Store user data in AsyncStorage (non-sensitive)
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      // Store token securely
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);

      setUser(userData);
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || "Sign up failed");
      }

      // Extract token from response
      const token = data.token;
      if (!token) {
        throw new Error("No token received from server");
      }

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || name,
      };

      // Store user data in AsyncStorage (non-sensitive)
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      // Store token securely
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);

      setUser(userData);
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const clearAuthState = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      setUser(null);
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
