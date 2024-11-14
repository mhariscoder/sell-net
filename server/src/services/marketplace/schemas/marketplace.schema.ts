import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Marketplace extends Document {
  
}

export const MarketplaceSchema = SchemaFactory.createForClass(Marketplace);