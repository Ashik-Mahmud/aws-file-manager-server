import {
    Body,
    Controller,
    Post,
} from '@nestjs/common';

import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) { }

    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
    })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully.',
    })
    async register(
        @Body() registerDto: RegisterDto,
    ) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @ApiOperation({
        summary: 'Login user',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns a JWT access token.',
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid email or password.',
    })
    async login(
        @Body() loginDto: LoginDto,
    ) {
        return this.authService.login(loginDto);
    }
}