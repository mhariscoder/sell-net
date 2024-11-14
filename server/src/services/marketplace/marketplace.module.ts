import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

import { MarketplaceDatabaseModule } from './config/database.module';
import { Marketplace, MarketplaceSchema } from './schemas/marketplace.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MARKETPLACE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4001,
        },
      },
    ]),

    MarketplaceDatabaseModule,
    MongooseModule.forFeature([
      { name: Marketplace.name, schema: MarketplaceSchema },
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
