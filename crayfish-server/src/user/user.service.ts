import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    async findOne(username: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { username },
        });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
    }
}
