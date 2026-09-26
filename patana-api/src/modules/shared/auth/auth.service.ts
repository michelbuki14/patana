import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUser(email: string, _password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return user;
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
