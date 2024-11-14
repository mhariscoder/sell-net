import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { StoreController } from './store.controller';
import { StoreService } from './store.service';

import { StoreDatabaseModule } from './config/database.module';
import { Store, StoreSchema } from './schemas/store.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'STORE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4003,
        },
      },
    ]),

    StoreDatabaseModule,
    MongooseModule.forFeature([{ name: Store.name, schema: StoreSchema }]),
  ],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
