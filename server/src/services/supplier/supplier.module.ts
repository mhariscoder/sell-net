import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

import { SupplierDatabaseModule } from './config/database.module';
import { Supplier, SupplierSchema } from './schemas/supplier.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SUPPLIER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4002,
        },
      },
    ]),

    SupplierDatabaseModule,
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
    ]),
  ],
  controllers: [SupplierController],
  providers: [SupplierService],
})
export class SupplierModule {}
