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
  @Prop({ type: Object })
  listingInfo: {
    title: string;
    startPrice: {
      value: number;
      immutability: boolean;
    };
    quantity: number;
    soldQuantity: number;
    categoryId: number;
  };

  // PreviousInfo fields
  @Prop({ type: Object })
  previousInfo: {
    title: string;
    startPrice: number;
    quantity: number;
  };

  // InventoryInfo fields
  @Prop({ type: Object })
  inventoryInfo: {
    prices: any;
    weightLb: number;
    oem: string;
    partslink: string;
    itemNumber: string;
    appliedFormula: string;
    description: string;
    quantity: number;
    shippingCost: number;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  marketplaceInfo: any;

  @Prop([MongooseSchema.Types.Mixed])
  suppliersPrices: any[];

  @Prop([{
    id: { type: String },
    message: { type: String }
  }])
  errorLogs: { id: string; message: string }[];

  @Prop({ type: Boolean })
  analyzed: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  competitorInfo: any;

  @Prop({ type: Number })
  priceMarkUp: number;

  @Prop({ type: Boolean })
  supplierCostAdjustment: boolean;

  _id: string;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
