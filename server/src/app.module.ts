import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

import { ListingModule } from './services/listing/listing.module';
import { MarketplaceModule } from './services/marketplace/marketplace.module';
import { StoreModule } from './services/store/store.module';
import { SupplierModule } from './services/supplier/supplier.module';
import { NotificationModule } from './services/notification/notification.module';

import { InventoryManagementModule } from './services/inventory-management/inventory-management.module';
import { ListingOptimizationModule } from './services/listing-optimization/listing-optimization.module';
import { StoreSynchronizationModule } from './services/store-synchronization/store-synchronization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,

    AuthModule,
    UserModule,

    ListingModule,
    MarketplaceModule,
    StoreModule,
    SupplierModule,
    NotificationModule,

    InventoryManagementModule,
    ListingOptimizationModule,
    StoreSynchronizationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
