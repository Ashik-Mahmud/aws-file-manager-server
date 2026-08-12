import {
    ConflictException,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly dynamoDBService: DynamoDBService,
    ) { }

    // Register a new user
    async register(registerDto: RegisterDto) {
        const { email, password } = registerDto;

        const existingUser =
            await this.dynamoDBService.getUserByEmail(email);

        if (existingUser) {
            throw new ConflictException(
                'Email already registered',
            );
        }

        const userId = randomUUID();

        const passwordHash = await bcrypt.hash(password, 10);

        await this.dynamoDBService.putItem({
            PK: `USER#${userId}`,
            SK: 'PROFILE',

            GSI1PK: `EMAIL#${email.toLowerCase()}`,
            GSI1SK: 'USER',

            entityType: 'USER',
            userId,
            email: email.toLowerCase(),
            passwordHash,

            createdAt: new Date().toISOString(),
        });

        return {
            message: 'User registered successfully',
            userId,
            email,
        };
    }

    // Login a user
    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user =
            await this.dynamoDBService.getUserByEmail(email);

        if (!user) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!passwordMatches) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        const payload = {
            sub: user.userId,
            email: user.email,
        };

        const accessToken =
            await this.jwtService.signAsync(payload);

        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: '1h',
        };
    }
}
