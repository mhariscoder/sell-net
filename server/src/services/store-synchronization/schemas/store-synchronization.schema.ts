import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class StoreSynchronization extends Document {}

export const StoreSynchronizationSchema =
  SchemaFactory.createForClass(StoreSynchronization);
