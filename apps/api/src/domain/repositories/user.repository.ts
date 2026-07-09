import type { User } from '../entities/user.entity.js';

// Interface owned by the domain layer; implemented by infrastructure (Prisma).
// Use cases depend on this abstraction, never on Prisma directly — this is the
// Dependency Inversion that keeps business logic testable and ORM-agnostic.
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: { email: string; passwordHash: string; name: string }): Promise<User>;
}
