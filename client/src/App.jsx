import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const api = async (url, o = {}) => {
  const res = await fetch('/api' + url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && JSON.stringify(o.body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};
const CATS = [['Men', '👔'], ['Women', '👗'], ['Kids', '🧸'], ['Shoes', '👟'], ['Watches', '⌚'], ['Grocery', '🧺'], ['Jewelry', '💍'], ['Accessories', '👜'], ['Home', '🏺'], ['Furniture', '🛋️'], ['Movies', '🎬'], ['Books', '📚']];
const money = n => '₹' + n.toLocaleString('en-IN');
const hue = s => ([...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 360;
const emoji = c => (CATS.find(x => x[0] === c) || [])[1];

const Ctx = createContext();
const useShop = () => useContext(Ctx);
function Provider({ children }) {
  const [user, setUser] = useState(null), [drawer, setDrawer] = useState(false), [toast, setToast] = useState('');
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'));
  useEffect(() => { api('/auth/me').then(setUser).catch(() => {}); }, []);
  useEffect(() => localStorage.setItem('cart', JSON.stringify(cart)), [cart]);
  const say = m => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const add = (p, qty = 1) => {
    setCart(c => (c.find(i => i.id === p._id) ? c.map(i => (i.id === p._id ? { ...i, qty: i.qty + qty } : i)) : [...c, { id: p._id, name: p.name, price: p.price, category: p.category, qty }]));
    say(`${p.name} added to your cart`);
  };
  const setQty = (id, q) => setCart(c => (q < 1 ? c.filter(i => i.id !== id) : c.map(i => (i.id === id ? { ...i, qty: q } : i))));
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0), count = cart.reduce((s, i) => s + i.qty, 0);
  return <Ctx.Provider value={{ user, setUser, cart, setCart, add, setQty, sub, count, drawer, setDrawer, toast, say }}>{children}</Ctx.Provider>;
}

const Tile = ({ p, big }) => (
  <div className={'tile' + (big ? ' big' : '')} style={{ '--h': hue(p.name) }}>
    {p.image ? <img src={p.image} alt={p.name} /> : <motion.span className="emo" whileHover={{ rotate: 14, scale: 1.2 }}>{emoji(p.category)}</motion.span>}
  </div>
);

function Header() {
  const { user, setUser, count, setDrawer } = useShop(), nav = useNavigate(), [q, setQ] = useState('');
  return (
    <header><div className="wrap">
      <Link to="/" className="logo">bazaar</Link>
      <form className="search" onSubmit={e => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q)}`); }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search shirts, sofas, novels…" aria-label="Search products" />
      </form>
      <nav className="nav">
        <Link to="/shop">Shop</Link>
        {user ? <><Link to="/orders">Orders</Link><button onClick={() => api('/auth/logout', { method: 'POST' }).then(() => setUser(null))}>Log out</button></> : <Link to="/login">Log in</Link>}
        <button className="bag" onClick={() => setDrawer(true)}>Cart <motion.b key={count} initial={{ scale: 1.8 }} animate={{ scale: 1 }}>{count}</motion.b></button>
      </nav>
    </div></header>
  );
}

const Card = ({ p, i }) => {
  const { add } = useShop();
  return (
    <motion.article className="card" initial={{ opacity: 0, scale: .94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: (i % 4) * .06 }}>
      <Link to={`/p/${p.slug}`}><Tile p={p} /></Link>
      <div className="meta"><div><h3>{p.name}</h3><span>{p.category}</span></div><b>{money(p.price)}{p.compareAt && <s>{money(p.compareAt)}</s>}</b></div>
      <button className="btn sm" disabled={!p.stock} onClick={() => add(p)}>{p.stock ? 'Add to cart' : 'Sold out'}</button>
    </motion.article>
  );
};

const words = 'Wear it, cook with it, read it, sit on it.'.split(' ');
const Marquee = ({ rev }) => <div className={'marq' + (rev ? ' rev' : '')}><div>{[...CATS, ...CATS].map(([n, e], i) => <Link key={i} to={`/shop?category=${n}`}>{e} {n}</Link>)}</div></div>;

function Home() {
  const [items, setItems] = useState([]);
  useEffect(() => { api('/products?featured=1').then(setItems).catch(() => {}); }, []);
  const demo = [{ name: 'Wrap Midi Dress', category: 'Women' }, { name: 'Oak Bedside Table', category: 'Furniture' }, { name: 'Steel Chrono Watch', category: 'Watches' }];
  return <>
    <div className="hero">
      <div className="blob" style={{ width: 380, height: 380, background: '#3A2EFF55', top: -80, left: -60 }} />
      <div className="blob" style={{ width: 320, height: 320, background: '#FF7A3D66', right: 0, bottom: -60, animationDelay: '-5s' }} />
      <div className="wrap">
        <div>
          <h1>{words.map((w, i) => <motion.span key={i} initial={{ opacity: 0, y: 50, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: .1 + i * .09, type: 'spring', stiffness: 120 }}>{w}</motion.span>)}</h1>
          <p>Twelve departments, one cart. Fashion, shoes, home, groceries, films and books, delivered to your door.</p>
          <Link to="/shop" className="btn">Shop new arrivals</Link>
        </div>
        <div className="stack">{demo.map(p => <Tile key={p.name} p={p} />)}</div>
      </div>
    </div>
    <Marquee /><Marquee rev />
    <div className="band" style={{ marginTop: 40 }}><p>Free delivery over ₹999 · Pay on delivery available</p></div>
    <section><div className="wrap"><h2>Pick a department</h2>
      <div className="cats">{CATS.map(([n, e]) => <Link key={n} className="cat" style={{ '--h': hue(n) }} to={`/shop?category=${n}`}><em>{e}</em>{n}</Link>)}</div></div></section>
    <section><div className="wrap"><h2>Picked for you</h2><div className="grid">{items.map((p, i) => <Card key={p._id} p={p} i={i} />)}</div></div></section>
  </>;
}

function Shop() {
  const [sp, setSp] = useSearchParams(), [items, setItems] = useState(null);
  const cat = sp.get('category') || '', q = sp.get('q') || '', sort = sp.get('sort') || '';
  useEffect(() => { setItems(null); api(`/products?${new URLSearchParams({ category: cat, q, sort })}`).then(setItems).catch(() => setItems([])); }, [cat, q, sort]);
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  return <section><div className="wrap">
    <h2>{q ? `Results for “${q}”` : cat || 'All products'}</h2>
    <div className="chips">{['', ...CATS.map(c => c[0])].map(c => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => set('category', c)}>{c || 'Everything'}</button>)}</div>
    <div className="bar"><span>{items ? `${items.length} items` : 'Loading…'}</span>
      <select value={sort} onChange={e => set('sort', e.target.value)} aria-label="Sort"><option value="">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></div>
    <div className="grid" key={cat + q + sort}>{items?.map((p, i) => <Card key={p._id} p={p} i={i} />)}</div>
    {items?.length === 0 && <p>Nothing matches yet. Try another department or clear your search.</p>}
  </div></section>;
}

function Detail() {
  const { slug } = useParams(), { add } = useShop(), [p, setP] = useState(null), [q, setQ] = useState(1);
  useEffect(() => { api(`/products/${slug}`).then(setP).catch(() => setP(false)); }, [slug]);
  if (p === false) return <section className="wrap"><h2>We couldn’t find that product</h2><Link to="/shop" className="btn">Back to shop</Link></section>;
  if (!p) return <section className="wrap">Loading…</section>;
  return <section><div className="wrap detail">
    <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}><Tile p={p} big /></motion.div>
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}>
      <Link to={`/shop?category=${p.category}`} className="tag">{p.category}</Link>
      <h1 style={{ marginTop: 14 }}>{p.name}</h1><div className="price">{money(p.price)} {p.compareAt && <s style={{ fontSize: 18, color: 'var(--mut)' }}>{money(p.compareAt)}</s>}</div>
      <p style={{ maxWidth: 480, marginBottom: 20 }}>{p.description}</p>
      <p style={{ marginBottom: 20, color: 'var(--mut)' }}>{p.stock > 0 ? `${p.stock} in stock` : 'Sold out'}</p>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="qty"><button onClick={() => setQ(Math.max(1, q - 1))}>−</button>{q}<button onClick={() => setQ(Math.min(p.stock, q + 1))}>+</button></div>
        <button className="btn" disabled={!p.stock} onClick={() => add(p, q)}>Add to cart</button>
      </div>
    </motion.div>
  </div></section>;
}

function Drawer() {
  const { cart, setQty, sub, drawer, setDrawer } = useShop(), nav = useNavigate();
  return <AnimatePresence>{drawer && <>
    <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
    <motion.aside className="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}>
      <h2 style={{ fontSize: 30, margin: 0 }}>Your cart</h2>
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 14, alignContent: 'start' }}>
        {!cart.length && <p>Your cart is empty. Pick something from the shop.</p>}
        {cart.map(i => <motion.div layout key={i.id} className="line"><Tile p={i} /><div><b>{i.name}</b><br />{money(i.price)}</div>
          <div className="qty"><button onClick={() => setQty(i.id, i.qty - 1)}>−</button>{i.qty}<button onClick={() => setQty(i.id, i.qty + 1)}>+</button></div></motion.div>)}
      </div>
      <p>Subtotal <b>{money(sub)}</b><br /><small>{sub >= 999 || !sub ? 'Delivery is free' : `Add ${money(999 - sub)} more for free delivery`}</small></p>
      <button className="btn" disabled={!cart.length} onClick={() => { setDrawer(false); nav('/checkout'); }}>Checkout</button>
    </motion.aside></>}</AnimatePresence>;
}

function Auth() {
  const { setUser } = useShop(), nav = useNavigate(), [mode, setMode] = useState('login'), [f, setF] = useState({}), [err, setErr] = useState('');
  const go = e => { e.preventDefault(); api(`/auth/${mode}`, { method: 'POST', body: f }).then(u => { setUser(u); nav(-1); }).catch(x => setErr(x.message)); };
  const on = k => ({ value: f[k] || '', onChange: e => setF({ ...f, [k]: e.target.value }) });
  return <section><div className="wrap"><div className="panel">
    <h2 style={{ marginBottom: 0 }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
    <form onSubmit={go}>{mode === 'register' && <input placeholder="Full name" {...on('name')} />}
      <input type="email" placeholder="Email" {...on('email')} /><input type="password" placeholder="Password" {...on('password')} />
      {err && <p className="err">{err}</p>}<button className="btn">{mode === 'login' ? 'Log in' : 'Create account'}</button></form>
    <p style={{ marginTop: 14 }}><a href="#" onClick={e => { e.preventDefault(); setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}</a></p>
  </div></div></section>;
}

function Checkout() {
  const { user, cart, setCart, sub, say } = useShop(), nav = useNavigate(), [a, setA] = useState({}), [err, setErr] = useState('');
  if (!user) return <section className="wrap"><h2>Log in to place your order</h2><Link to="/login" className="btn">Log in</Link></section>;
  const ship = sub >= 999 ? 0 : 79, on = k => ({ value: a[k] || '', onChange: e => setA({ ...a, [k]: e.target.value }), required: true });
  const place = e => { e.preventDefault(); api('/orders', { method: 'POST', body: { items: cart, address: a } }).then(() => { setCart([]); say('Order placed. Pay when it arrives.'); nav('/orders'); }).catch(x => setErr(x.message)); };
  return <section><div className="wrap"><div className="panel"><h2 style={{ marginBottom: 0 }}>Delivery details</h2>
    <form onSubmit={place}><input placeholder="Full name" {...on('name')} /><input placeholder="Phone" {...on('phone')} /><input placeholder="Address" {...on('line')} />
      <input placeholder="City" {...on('city')} /><input placeholder="PIN code" {...on('pin')} />
      <p>Items {money(sub)} · Delivery {ship ? money(ship) : 'Free'}<br /><b>Total {money(sub + ship)}</b> · Cash on delivery</p>
      {err && <p className="err">{err}</p>}<button className="btn" disabled={!cart.length}>Place order</button></form></div></div></section>;
}

function Orders() {
  const { user } = useShop(), [o, setO] = useState(null);
  useEffect(() => { user && api('/orders/mine').then(setO); }, [user]);
  if (!user) return <section className="wrap"><h2>Log in to see your orders</h2><Link to="/login" className="btn">Log in</Link></section>;
  return <section><div className="wrap"><h2>Your orders</h2>{o?.length === 0 && <p>No orders yet.</p>}
    {o?.map(x => <motion.div key={x._id} className="order" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="tag">{x.status}</span>
      <p><b>{money(x.total)}</b> · {new Date(x.createdAt).toLocaleDateString()}</p><p>{x.items.map(i => `${i.name} × ${i.qty}`).join(', ')}</p></motion.div>)}</div></section>;
}

const Toast = () => { const { toast } = useShop(); return <AnimatePresence>{toast && <motion.div className="toast" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>; };

export default function App() {
  return <BrowserRouter><Provider><Header /><Drawer /><Toast /><main>
    <Routes><Route path="/" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/p/:slug" element={<Detail />} />
      <Route path="/login" element={<Auth />} /><Route path="/checkout" element={<Checkout />} /><Route path="/orders" element={<Orders />} /></Routes>
  </main><footer>© Bazaar · Free delivery over ₹999</footer></Provider></BrowserRouter>;
}
