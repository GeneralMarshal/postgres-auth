import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World lets proceed to learn backend authentication using nestjs!';
  }
}
