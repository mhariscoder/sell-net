import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryUpload, InventoryUploadSchema } from './schemas/inventory-upload.schema';
import { SupplierConfig, SupplierConfigSchema } from '../supplier-config/schemas/supplier-config.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4003,
        },
      },
    ]), 
    MongooseModule.forFeature([
      { name: InventoryUpload.name, schema: InventoryUploadSchema },
      { name: SupplierConfig.name, schema: SupplierConfigSchema }
    ], 'DATABASE_CONNECTION'),   
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}