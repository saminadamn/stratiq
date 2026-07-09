// Domain entity: the shape business logic operates on. Distinct from the Prisma
// model (infrastructure concern) and from UserDto (presentation concern) even
// though today they look similar — that's what lets any one of them change
// independently without rippling through the others.
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}
