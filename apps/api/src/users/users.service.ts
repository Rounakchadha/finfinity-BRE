import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  pan: string;
  mobile: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertUserDto {
  pan: string;
  mobile: string;
  name: string;
}

/**
 * UsersService — in-memory user store for demo mode.
 *
 * PRODUCTION INTEGRATION:
 * Replace the in-memory Map with Prisma calls:
 *
 *   constructor(private prisma: PrismaService) {}
 *
 *   async upsertUser(dto: UpsertUserDto): Promise<User> {
 *     return this.prisma.user.upsert({
 *       where: { mobile: dto.mobile },
 *       update: { name: dto.name },
 *       create: { pan: dto.pan, mobile: dto.mobile, name: dto.name },
 *     });
 *   }
 *
 *   async findById(id: string): Promise<User | null> {
 *     return this.prisma.user.findUnique({ where: { id } });
 *   }
 *
 *   async findByMobile(mobile: string): Promise<User | null> {
 *     return this.prisma.user.findUnique({ where: { mobile } });
 *   }
 *
 *   async findByPan(pan: string): Promise<User | null> {
 *     return this.prisma.user.findUnique({ where: { pan } });
 *   }
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  // In-memory store — keyed by userId
  private readonly users = new Map<string, User>();
  // Secondary index: mobile → userId
  private readonly byMobile = new Map<string, string>();
  // Secondary index: pan → userId
  private readonly byPan = new Map<string, string>();

  /**
   * Creates a new user or updates name if user exists by mobile.
   */
  async upsertUser(dto: UpsertUserDto): Promise<User> {
    const existingId = this.byMobile.get(dto.mobile);

    if (existingId) {
      const existing = this.users.get(existingId);
      if (existing) {
        // Update name if changed
        existing.name = dto.name;
        existing.updatedAt = new Date();
        this.logger.log(`Updated user ${existing.id} (mobile: ${dto.mobile})`);
        return existing;
      }
    }

    // Create new user
    const user: User = {
      id: randomUUID(),
      pan: dto.pan.toUpperCase(),
      mobile: dto.mobile,
      name: dto.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    this.byMobile.set(user.mobile, user.id);
    this.byPan.set(user.pan, user.id);

    this.logger.log(`Created new user ${user.id} (PAN: ${user.pan})`);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByMobile(mobile: string): Promise<User | null> {
    const id = this.byMobile.get(mobile);
    if (!id) return null;
    return this.users.get(id) ?? null;
  }

  async findByPan(pan: string): Promise<User | null> {
    const id = this.byPan.get(pan.toUpperCase());
    if (!id) return null;
    return this.users.get(id) ?? null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async count(): Promise<number> {
    return this.users.size;
  }
}
