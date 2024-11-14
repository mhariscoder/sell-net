import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ListingOptimizationController } from './listing-optimization.controller';
import { ListingOptimizationService } from './listing-optimization.service';

import { ListingOptimizationDatabaseModule } from './config/database.module';
import {
  ListingOptimization,
  ListingOptimizationSchema,
} from './schemas/listing-optimization.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LISTING_OPTIMIZATION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4102,
        },
      },
    ]),

    ListingOptimizationDatabaseModule,
    MongooseModule.forFeature([
      { name: ListingOptimization.name, schema: ListingOptimizationSchema },
    ]),
  ],
  controllers: [ListingOptimizationController],
  providers: [ListingOptimizationService],
})
export class ListingOptimizationModule {}
