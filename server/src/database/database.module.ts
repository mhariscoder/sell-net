import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('DATABASE_URI');

        mongoose.connection.on('connected', () => {
          console.log('✅ Connected to Sell-Net MongoDB');
        });
        mongoose.connection.on('error', (error) => {
          console.error('❌ Error connecting to MongoDB:', error);
        });
        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️ MongoDB connection lost');
        });

        await mongoose.connect(uri);
      },
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}
