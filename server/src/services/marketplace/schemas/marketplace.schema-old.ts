import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MarketplaceConfig extends Document {
  @Prop({ type: String, enum: ['ebay', 'amazon'] })
  marketplace: string;

  @Prop({ type: Object })
  config: any;
}

export const MarketplaceConfigSchema =
  SchemaFactory.createForClass(MarketplaceConfig);