import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class InventoryManagement extends Document {}

export const InventoryManagementSchema =
  SchemaFactory.createForClass(InventoryManagement);