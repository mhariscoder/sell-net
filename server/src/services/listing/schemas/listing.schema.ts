import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Listing extends Document {
  @Prop({ type: String })
  itemId: string;

  @Prop({ type: Types.ObjectId, ref: 'StoreConfig' })
  storeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SupplierConfig' })
  supplierId: Types.ObjectId;

  @Prop({ type: String })
  sku: string;

  @Prop({ type: Boolean })
  synced: boolean;

  @Prop({ type: String, enum: ['sync', 'locked', 'idle'] })
  status: string;

  @Prop({ type: String, enum: ['revise', 'sync', 'reSync'] })
  updateType: string;

  // ListingInfo fields
  @Prop({ type: String })
  'listingInfo.title': string;

  @Prop({ type: Number })
  'listingInfo.startPrice.value': number;

  @Prop({ type: Boolean })
  'listingInfo.startPrice.immutability': boolean;

  @Prop({ type: Number })
  'listingInfo.quantity': number;

  @Prop({ type: Number })
  'listingInfo.soldQuantity': number;

  @Prop({ type: Number })
  'listingInfo.categoryId': number;

  // PreviousInfo fields
  @Prop({ type: String })
  'previousInfo.title': string;

  @Prop({ type: Number })
  'previousInfo.startPrice': number;

  @Prop({ type: Number })
  'previousInfo.quantity': number;

  // InventoryInfo fields
  @Prop({ type: MongooseSchema.Types.Mixed })
  'inventoryInfo.prices': any;

  @Prop({ type: Number })
  'inventoryInfo.weightLb': number;

  @Prop({ type: String })
  'inventoryInfo.oem': string;

  @Prop({ type: String })
  'inventoryInfo.partslink': string;

  @Prop({ type: String })
  'inventoryInfo.itemNumber': string;

  @Prop({ type: String })
  'inventoryInfo.appliedFormula': string;

  @Prop({ type: String })
  'inventoryInfo.description': string;

  @Prop({ type: Number })
  'inventoryInfo.quantity': number;

  @Prop({ type: Number })
  'inventoryInfo.shippingCost': number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  marketplaceInfo: any;

  @Prop([{ type: MongooseSchema.Types.Mixed }])
  suppliersPrices: any[];

  @Prop([{ id: String, message: String }])
  errorLogs: { id: string; message: string }[];

  @Prop({ type: Boolean })
  analyzed: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  competitorInfo: any;

  @Prop({ type: Number })
  priceMarkUp: number;

  @Prop({ type: Boolean })
  supplierCostAdjustment: boolean;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);