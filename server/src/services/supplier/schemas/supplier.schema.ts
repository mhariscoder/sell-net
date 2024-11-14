import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Supplier extends Document {
  
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
