import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Store extends Document {

}

export const StoreSchema = SchemaFactory.createForClass(Store);
