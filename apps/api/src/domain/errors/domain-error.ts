// Base class for errors that originate from business rules (as opposed to
// infrastructure failures like a dropped DB connection). The presentation layer
// maps each `code` to an HTTP status, so adding a new domain error never requires
// touching Express routing — only the error-handler's status map.
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'EMAIL_ALREADY_IN_USE';
  readonly httpStatus = 409;
  constructor() {
    super('An account with this email already exists.');
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly httpStatus = 401;
  constructor() {
    super('Invalid email or password.');
  }
}

export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'INVALID_REFRESH_TOKEN';
  readonly httpStatus = 401;
  constructor() {
    super('Refresh token is invalid, expired, or has already been used.');
  }
}

export class InsufficientRoleError extends DomainError {
  readonly code = 'INSUFFICIENT_ROLE';
  readonly httpStatus = 403;
  constructor() {
    super('You do not have permission to perform this action.');
  }
}

export class NotAMemberError extends DomainError {
  readonly code = 'NOT_A_MEMBER';
  readonly httpStatus = 403;
  constructor() {
    super('You are not a member of this organization.');
  }
}
