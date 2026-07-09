import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../application/ports/password-hasher.port.js';

// bcryptjs (pure JS) instead of native bcrypt: no node-gyp/native build step,
// which keeps `npm install` reliable across contributor machines and CI images
// without a C++ toolchain — a meaningful cost for a small security benefit here.
const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
