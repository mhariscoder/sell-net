import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Listing extends Document {}

export const ListingSchema = SchemaFactory.createForClass(Listing);
