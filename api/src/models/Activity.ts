import { Schema, model } from 'mongoose';

export interface Activity {
  project: string;
  employee: string;
  date: string;   // ISO YYYY-MM-DD
  hours: number;
}

const ActivitySchema = new Schema<Activity>({
  project: { type: String, required: true, index: true },
  employee: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true },
  hours: { type: Number, required: true, min: 0 }
}, { timestamps: false });

export const ActivityModel = model<Activity>('Activity', ActivitySchema);