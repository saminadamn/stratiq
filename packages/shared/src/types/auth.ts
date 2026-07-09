import type { UserDto } from './user.js';
import type { OrganizationMembershipDto } from './organization.js';

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  // ISO timestamp so both sides agree on when the access token stops being useful,
  // instead of the client having to decode the JWT to find out.
  accessTokenExpiresAt: string;
}

export interface AuthResponse {
  user: UserDto;
  organizations: OrganizationMembershipDto[];
  tokens: AuthTokens;
}

// Decoded shape of the access token payload. Kept minimal and free of PII beyond
// what's already public within the product (email is shown in the UI chrome).
export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  type: 'access';
}
