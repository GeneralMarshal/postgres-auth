import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  HttpCode,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { HttpStatus } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  tokenId?: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    const user = req.user; // ← User from strategy validate()
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Body() updateUserDto: UpdateUserDto, @Param('id') id: string) {
    return this.usersService.update(updateUserDto, id);
  }
}
