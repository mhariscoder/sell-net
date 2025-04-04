import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SupplierConfig extends Document {
  @Prop({ type: String, required: true })
  supplier: string;

  @Prop({ type: String })
  supplierNonCamelCase: string;

  @Prop({ type: String })
  itemIdentifier: string;

  @Prop({ type: String })
  skuPrefix: string;

  @Prop([{ type: String }])
  priceFormulas: string[];

  @Prop({ type: Number })
  backupInventoryHandlingSubtractionQuantity: number;

  @Prop({ type: Date })
  lastInventoryUpload: Date;

  @Prop({ type: Date })
  lastShippingUpload: Date;
}

export const SupplierConfigSchema = SchemaFactory.createForClass(SupplierConfig);
