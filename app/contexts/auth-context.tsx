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

const AUTH_STORAGE_KEY = "tabbit.auth";
const TOKEN_STORAGE_KEY = "tabbit.token";

const GOOGLE_IOS_CLIENT_ID =
  "1007672962218-o67io1st4gnevkinaqo4cdeo38ergoh4.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID =
  "1007672962218-fv05df92ij6i74bahnfg3gkmgril1ol1.apps.googleusercontent.com";

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

const handleGoogleError = (error: unknown): never => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === statusCodes.SIGN_IN_CANCELLED
  ) {
    throw new Error("Sign in was cancelled");
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === statusCodes.IN_PROGRESS
  ) {
    throw new Error("Sign in is already in progress");
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
  ) {
    throw new Error("Google Play Services not available");
  }
  throw error;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        return false;
      }

      if (response.ok) {
        const data = await response.json();
        return data.success === true && !!data.user;
      }

      return true;
    } catch (error) {
      console.warn("Token verification network error:", error);
      return true;
    }
  }, []);

  const clearAuthStorage = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
    setUser(null);
  }, []);

  const loadAuthState = useCallback(async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      let token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);

      if (!token) {
        const oldToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (oldToken) {
          await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, oldToken);
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          token = oldToken;
        }
      }

      if (stored && token) {
        const userData = JSON.parse(stored);
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

  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  const storeAuthData = useCallback(
    async (token: string, userData: User): Promise<void> => {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
      setUser(userData);
    },
    []
  );

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
      };

      return { token, user: userData };
    },
    []
  );

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<void> => {
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
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
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

    const userData: User = {
      ...baseUser,
      name: baseUser.name || name,
    };

    await storeAuthData(token, userData);
  };

  const signOut = async (): Promise<void> => {
    await clearAuthStorage();
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data || !userInfo.data.user) {
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
      console.error("Error signing in with Google:", error);
      handleGoogleError(error);
    }
  };

  const signInWithApple = async (): Promise<void> => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Apple Authentication is not available on this device");
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

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
    await clearAuthStorage();
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
