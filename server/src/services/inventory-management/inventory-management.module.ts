import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { InventoryManagementController } from './inventory-management.controller';
import { InventoryManagementService } from './inventory-management.service';

import { InventoryManagementDatabaseModule } from './config/database.module';
import {
  InventoryManagement,
  InventoryManagementSchema,
} from './schemas/inventory-management.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INVENTORY_MANAGEMENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4101,
        },
      },
    ]),

    InventoryManagementDatabaseModule,
    MongooseModule.forFeature([
      { name: InventoryManagement.name, schema: InventoryManagementSchema },
    ]),
  ],
  controllers: [InventoryManagementController],
  providers: [InventoryManagementService],
})
export class InventoryManagementModule {}
