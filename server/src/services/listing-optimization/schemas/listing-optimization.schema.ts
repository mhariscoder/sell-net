import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ListingOptimization extends Document {}

export const ListingOptimizationSchema =
  SchemaFactory.createForClass(ListingOptimization);
