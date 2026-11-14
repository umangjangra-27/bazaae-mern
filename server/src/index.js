import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Product, Order } from './models.js';

const app = express();
app.use(helmet(), cors({ origin: process.env.CLIENT_URL, credentials: true }), express.json(), cookieParser());
const wrap = f => (req, res, next) => f(req, res, next).catch(next);
const sign = (res, u) => res.cookie('token', jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 6048e5 });
const pub = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const auth = wrap(async (req, res, next) => {
  try { req.user = await User.findById(jwt.verify(req.cookies.token, process.env.JWT_SECRET).id); } catch {}
  req.user ? next() : res.status(401).json({ message: 'Please log in first' });
});
const admin = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' }));
const r = express.Router();

r.post('/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || (password || '').length < 6) return res.status(400).json({ message: 'Enter your name, email and a password of 6+ characters' });
  if (await User.findOne({ email })) return res.status(409).json({ message: 'This email is already registered' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  sign(res, u); res.status(201).json(pub(u));
}));
r.post('/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: req.body.email });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ message: 'Wrong email or password' });
  sign(res, u); res.json(pub(u));
}));
r.post('/auth/logout', (req, res) => res.clearCookie('token').json({ ok: true }));
r.get('/auth/me', auth, (req, res) => res.json(pub(req.user)));

r.get('/products', wrap(async (req, res) => {
  const { category, q, sort, featured } = req.query, f = {};
  if (category) f.category = category;
  if (featured) f.featured = true;
  if (q) f.name = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const s = { price_asc: { price: 1 }, price_desc: { price: -1 } }[sort] || { createdAt: -1 };
  res.json(await Product.find(f).sort(s).limit(60));
}));
r.get('/products/:slug', wrap(async (req, res) => { const p = await Product.findOne({ slug: req.params.slug }); p ? res.json(p) : res.status(404).json({ message: 'Product not found' }); }));
r.post('/products', auth, admin, wrap(async (req, res) => res.status(201).json(await Product.create(req.body))));
r.put('/products/:id', auth, admin, wrap(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
r.delete('/products/:id', auth, admin, wrap(async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// Prices are always recalculated on the server; stock is decremented atomically.
r.post('/orders', auth, wrap(async (req, res) => {
  const { items, address } = req.body, lines = [];
  if (!items?.length || !address?.line) return res.status(400).json({ message: 'Your cart and delivery address are required' });
  for (const i of items) {
    const qty = Math.max(1, Math.floor(+i.qty || 1));
    const p = await Product.findOneAndUpdate({ _id: i.id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
    if (!p) { for (const l of lines) await Product.findByIdAndUpdate(l.product, { $inc: { stock: l.qty } }); return res.status(409).json({ message: 'An item in your cart is out of stock' }); }
    lines.push({ product: p._id, name: p.name, price: p.price, qty });
  }
  const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
  res.status(201).json(await Order.create({ user: req.user._id, items: lines, address, total: sub + (sub >= 999 ? 0 : 79) }));
}));
r.get('/orders/mine', auth, wrap(async (req, res) => res.json(await Order.find({ user: req.user._id }).sort('-createdAt'))));
r.get('/admin/orders', auth, admin, wrap(async (req, res) => res.json(await Order.find().populate('user', 'name email').sort('-createdAt'))));
r.put('/admin/orders/:id', auth, admin, wrap(async (req, res) => res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }))));

app.use('/api', r);
app.use((e, req, res, next) => { console.error(e); res.status(500).json({ message: 'Something went wrong on our side' }); });

const seed = `Men|Oxford Linen Shirt|1499|1999
Men|Tapered Chino Trousers|1799
Women|Wrap Midi Dress|2299|2999
Women|Cotton Kurta Set|1699
Kids|Dino Print Tee Set|799
Kids|Playground Denim Dungarees|1199|1499
Shoes|Cloudstep Running Sneakers|3499|4299
Shoes|Leather Chelsea Boots|4999
Watches|Steel Chrono Watch|6999|8999
Watches|Minimal Quartz Watch|2499
Grocery|Cold-Pressed Olive Oil 1L|899
Grocery|Assorted Millet Pack 2kg|549
Jewelry|Gold-Plated Hoop Earrings|1299
Jewelry|Silver Pendant Necklace|1999|2499
Accessories|Full-Grain Leather Wallet|1399
Accessories|Canvas Weekender Bag|2699
Home|Ceramic Dinner Set of 16|3299
Home|Linen Cushion Covers x4|899
Furniture|Oak Bedside Table|5499
Furniture|Three-Seater Fabric Sofa|28999|34999
Movies|Classic Cinema Blu-ray Box Set|1999
Movies|Award-Winning Dramas DVD Pack|899
Books|The Quiet Founder (Paperback)|449
Books|Illustrated Atlas of the World|1299`;

await mongoose.connect(process.env.MONGO_URI);
if (!(await Product.countDocuments())) await Product.insertMany(seed.split('\n').map((l, i) => {
  const [category, name, price, compareAt] = l.split('|');
  return { category, name, price: +price, compareAt: compareAt ? +compareAt : undefined, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), description: `${name} from our ${category} collection. Replace this with your own product copy.`, stock: 25, featured: i % 3 === 0 };
}));
if (!(await User.findOne({ role: 'admin' }))) await User.create({ name: 'Admin', email: 'admin@bazaar.test', password: await bcrypt.hash('admin123', 10), role: 'admin' });
app.listen(process.env.PORT || 5000, () => console.log('API ready'));
