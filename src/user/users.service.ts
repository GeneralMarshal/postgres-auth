import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { User } from '@prisma/client';
import { PasswordService } from 'src/common/services/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthJwtService } from 'src/auth/services/jwt/jwt.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private jwtService: AuthJwtService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user;
  }
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user;
  }

  async login(loginUserDto: LoginUserDto) {
    const { email } = loginUserDto;
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('Invalid Email or Password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is Inactive');
    }

    //up next is to verify the hashed password with the one that was passed in the dto

    const isVerified = await this.passwordService.comparePassword(
      loginUserDto.password,
      user.password,
    );

    if (!isVerified) {
      throw new UnauthorizedException('Invalid Email or Passowrd');
    }

    //upnext generate the acces token using the AuthJwtService
    const token = await this.jwtService.generateToken(user.id, user.email);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken: token,
    };
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await this.passwordService.hashPassword(
      createUserDto.password,
    );
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
      },
    });
  }

  async update(updateUserDto: UpdateUserDto, id: string) {
    const user = await this.findById(id);

    if (updateUserDto.email) {
      const emailExist = await this.findByEmail(updateUserDto.email);
      if (emailExist) {
        throw new ConflictException('user with this email already exists');
      }
    }

    if (!user) {
      throw new NotFoundException(`User with the id ${id} does not exist`);
    }

    const updateData: Partial<UpdateUserDto> = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await this.passwordService.hashPassword(
        updateUserDto.password,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...updatedUserWithoutPassword } = updatedUser;

    return updatedUserWithoutPassword;
  }
}
