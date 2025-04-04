import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class InventoryUpload extends Document {
  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  supplier: string;

  @Prop({ type: Types.ObjectId, ref: 'SupplierConfig' })
  supplierId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  chunked: boolean;

  @Prop({ type: Boolean, default: false })
  expired: boolean;

  @Prop([{ type: Types.ObjectId, ref: 'EbayStoreConfig' }])
  syncedStores: Types.ObjectId[];

  @Prop({ type: Date })
  sourceFileDate: Date;

  @Prop({ type: String, enum: ['manual', 'sftp', 'api', 'system'] })
  source: string;

  @Prop({ type: Number, default: 0 })
  totalChunks: number;

  @Prop([{
    fileName: { type: String },
    chunked: { type: Boolean },
    id: { type: String },
    message: { type: String }
  }])
  chunks: { fileName: string; chunked: boolean; id?: string; message?: string }[];

  readonly createdAt: Date;
}

export const InventoryUploadSchema = SchemaFactory.createForClass(InventoryUpload);
