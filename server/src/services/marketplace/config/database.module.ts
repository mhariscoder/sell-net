import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = `${configService.get<string>('CLUSTER_URI')}marketplace?retryWrites=true&w=majority`;

        mongoose.connection.on('connected', () => {
          console.log('✅ Connected to Marketplace MongoDB');
        });
        mongoose.connection.on('error', (error) => {
          console.error('❌ Error connecting to Marketplace MongoDB:', error);
        });
        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️ Marketplace MongoDB connection lost');
        });

        return { uri };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class MarketplaceDatabaseModule {}