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
        const uri = `${configService.get<string>('CLUSTER_URI')}store?retryWrites=true&w=majority`;

        mongoose.connection.on('connected', () => {
          console.log('✅ Connected to Store MongoDB');
        });
        mongoose.connection.on('error', (error) => {
          console.error('❌ Error connecting to Store MongoDB:', error);
        });
        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️ Store MongoDB connection lost');
        });

        return { uri };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class StoreDatabaseModule {}
