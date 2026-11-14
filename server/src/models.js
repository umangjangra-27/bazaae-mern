import mongoose from 'mongoose';
const { Schema, model } = mongoose;
export const User = model('User', new Schema({ name: String, email: { type: String, unique: true }, password: String, role: { type: String, default: 'customer' } }, { timestamps: true }));
export const Product = model('Product', new Schema({ name: String, slug: { type: String, unique: true }, description: String, category: String, price: Number, compareAt: Number, image: String, stock: { type: Number, default: 10 }, attributes: { type: Map, of: String }, featured: Boolean }, { timestamps: true }));
export const Order = model('Order', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, name: String, price: Number, qty: Number }],
  address: { name: String, phone: String, line: String, city: String, pin: String },
  payment: { type: String, default: 'cod' }, total: Number, status: { type: String, default: 'pending' } }, { timestamps: true }));
