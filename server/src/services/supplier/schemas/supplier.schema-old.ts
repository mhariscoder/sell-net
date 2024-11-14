import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
class PriceFormula {
  @Prop({ type: Number })
  rank: number;

  @Prop({ type: [String] })
  condition: string[];

  @Prop({
    type: [
      {
        type: { type: String, enum: ['operand', 'operator'] },
        value: String,
      },
    ],
  })
  formula: { type: string; value: string }[];
}

@Schema({ timestamps: true })
export class SupplierConfig extends Document {
  @Prop({ type: String })
  supplier: string;

  @Prop({ type: String })
  supplierNonCamelCase: string;

  @Prop({ type: String })
  itemIdentifier: string;

  @Prop({ type: String })
  skuPrefix: string;

  @Prop({ type: [String] })
  priceFormulas: string[];

  @Prop({ type: Number })
  backupInventoryHandlingSubtractionQuantity: number;

  @Prop({ type: Date })
  lastInventoryUpload: Date;

  @Prop({ type: Date })
  lastShippingUpload: Date;
}

export const SupplierConfigSchema =
  SchemaFactory.createForClass(SupplierConfig);