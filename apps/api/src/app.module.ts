import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BureauModule } from './bureau/bureau.module';
import { BREModule } from './bre/bre.module';
import { UsersModule } from './users/users.module';
import { AIModule } from './ai/ai.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    // ConfigModule is global — all modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Feature modules
    AuthModule,
    BureauModule,
    BREModule,
    UsersModule,
    AIModule,
    ProductsModule,
  ],
})
export class AppModule {}
