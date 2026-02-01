import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsEnum(UserRole as object, {
    message: 'Role must be one of: USER, ADMIN, MODERATOR, MANAGER',
  })
  role?: UserRole;
}
