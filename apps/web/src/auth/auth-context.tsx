import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AuthResponse,
  AuthTokens,
  LoginRequest,
  OrganizationMembershipDto,
  SignupRequest,
  UserDto,
} from '@stratiq/shared';
import { apiClient, setOnSessionExpired, setTokens } from '../lib/api-client';

interface AuthContextValue {
  user: UserDto | null;
  organizations: OrganizationMembershipDto[];
  isLoading: boolean;
  login: (input: LoginRequest) => Promise<void>;
  signup: (input: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Only the refresh token is persisted, so a page reload can restore a session
// by exchanging it for a new access token; the access token itself lives only
// in the api-client module's memory (see lib/api-client.ts for why).
const REFRESH_TOKEN_STORAGE_KEY = 'stratiq.refreshToken';

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<UserDto | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembershipDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function applySession(result: AuthResponse): void {
    setTokens({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken });
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, result.tokens.refreshToken);
    setUser(result.user);
    setOrganizations(result.organizations);
  }

  function clearSession(): void {
    setTokens(null);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    setUser(null);
    setOrganizations([]);
  }

  useEffect(() => {
    setOnSessionExpired(clearSession);

    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!storedRefreshToken) {
      setIsLoading(false);
      return;
    }

    // Bootstrap the session on load: trade the persisted refresh token for a
    // fresh access token, then fetch the current user with it.
    void (async () => {
      try {
        const tokens = await apiClient.post<AuthTokens>(
          '/api/v1/auth/refresh',
          { refreshToken: storedRefreshToken },
          false,
        );
        setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);

        const me = await apiClient.get<{
          user: UserDto;
          organizations: OrganizationMembershipDto[];
        }>('/api/v1/auth/me');
        setUser(me.user);
        setOrganizations(me.organizations);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(input: LoginRequest): Promise<void> {
    const result = await apiClient.post<AuthResponse>('/api/v1/auth/login', input, false);
    applySession(result);
  }

  async function signup(input: SignupRequest): Promise<void> {
    const result = await apiClient.post<AuthResponse>('/api/v1/auth/signup', input, false);
    applySession(result);
  }

  async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (refreshToken) {
      await apiClient.post('/api/v1/auth/logout', { refreshToken }, false).catch(() => undefined);
    }
    clearSession();
  }

  const value: AuthContextValue = { user, organizations, isLoading, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
