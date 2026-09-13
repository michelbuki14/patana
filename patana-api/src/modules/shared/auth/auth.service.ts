import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  // shared schema: User — identity & roles
  async validateUser(email: string, _password: string): Promise<unknown> {
    return { email, note: 'validateUser stub — check passwordHash, return User' };
  }
  async me(userId: string): Promise<unknown> { return { userId }; }
}
