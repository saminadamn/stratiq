// Public-facing user shape. Deliberately excludes passwordHash and anything else
// that must never leave the API process.
export interface UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
