import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';

import { ListingDatabaseModule } from './config/database.module';
import { Listing, ListingSchema } from './schemas/listing.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LISTING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4004,
        },
      },
    ]),

    ListingDatabaseModule,
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  controllers: [ListingController],
  providers: [ListingService],
})
export class ListingModule {}
