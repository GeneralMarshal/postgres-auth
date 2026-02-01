import { UserRole } from '@prisma/client';
import {
  IsEmail,
  MinLength,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(UserRole as object, {
    message: 'Role must be one of: USER, ADMIN, MODERATOR, MANAGER',
  })
  role?: UserRole;
}
