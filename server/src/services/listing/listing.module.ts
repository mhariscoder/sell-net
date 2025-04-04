import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';

import { ListingDatabaseModule } from './config/database.module';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { HttpModule } from '@nestjs/axios';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { Marketplace, MarketplaceSchema } from '../marketplace/schemas/marketplace.schema';
import { Store, StoreSchema } from '../store/schemas/store.schema';

@Module({
  imports: [
    HttpModule,
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
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }], 'DATABASE_CONNECTION'),
    MongooseModule.forFeature([{ name: Marketplace.name, schema: MarketplaceSchema }], 'DATABASE_CONNECTION'),
    MongooseModule.forFeature([{ name: Store.name, schema: StoreSchema }], 'DATABASE_CONNECTION'),
  ],
  controllers: [ListingController],
  providers: [ListingService],
})
export class ListingModule {}
