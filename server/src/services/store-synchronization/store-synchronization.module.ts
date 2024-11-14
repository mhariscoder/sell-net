import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { StoreSynchronizationController } from './store-synchronization.controller';
import { StoreSynchronizationService } from './store-synchronization.service';

import { StoreSynchronizationDatabaseModule } from './config/database.module';
import {
  StoreSynchronization,
  StoreSynchronizationSchema,
} from './schemas/store-synchronization.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'STORE_SYNCHRONIZATION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4103,
        },
      },
    ]),

    StoreSynchronizationDatabaseModule,
    MongooseModule.forFeature([
      { name: StoreSynchronization.name, schema: StoreSynchronizationSchema },
    ]),
  ],
  controllers: [StoreSynchronizationController],
  providers: [StoreSynchronizationService],
})
export class StoreSynchronizationModule {}
