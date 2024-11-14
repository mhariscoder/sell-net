import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
