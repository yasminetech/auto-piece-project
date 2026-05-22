import { FormEvent, useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { cancelOrder, createOrder, getAllOrders, getOrders, getProducts, getStats, login, register } from './api';
=======
import { cancelOrder, createOrder, getOrders, getProducts, login, register, getAllOrders, getStats } from './api';
>>>>>>> origin/ilyas-rabaa
import AdminPanel from './AdminPanel';
import type { CartItem, Order, Product, User } from './types';

const storedUser = localStorage.getItem('auto-piece-user');
const initialUser = storedUser ? (JSON.parse(storedUser) as User) : null;

function formatPrice(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmee',
    cancelled: 'Annulee',
    delivered: 'Livree',
  };

  return labels[status] ?? status;
}

export default function App() {
  const [user, setUser] = useState<User | null>(initialUser);
  const [space, setSpace] = useState<'store' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'store',
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminOrders, setAdminOrders] = useState<(Order & { username: string })[]>([]);
  const [stats, setStats] = useState<{ totalProducts: number; outOfStock: number; totalOrders: number } | null>(null);
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).filter(Boolean),
    [products],
  );

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [cart],
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  useEffect(() => {
    function syncSpace() {
      setSpace(window.location.hash === '#admin' ? 'admin' : 'store');
    }

    window.addEventListener('hashchange', syncSpace);
    window.addEventListener('popstate', syncSpace);

    return () => {
      window.removeEventListener('hashchange', syncSpace);
      window.removeEventListener('popstate', syncSpace);
    };
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, category]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auto-piece-user', JSON.stringify(user));
      if (user.role === 'admin') {
        setView('admin');
        loadAdminData(user.accessToken);
      } else {
        setView('user');
        loadOrders(user.accessToken);
      }
      return;
    }

    localStorage.removeItem('auto-piece-user');
    setOrders([]);
    setAdminOrders([]);
    setStats(null);
    setView('user');
  }, [user]);

  async function loadProducts() {
    try {
      setError('');
      const data = await getProducts(search, category);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les produits');
    }
  }

  async function loadOrders(token: string) {
    try {
      const data = await getOrders(token);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les commandes');
    }
  }

  async function loadAdminData(token: string) {
    try {
      const [ordersData, statsData] = await Promise.all([
        getAllOrders(token),
        getStats(token)
      ]);
      setAdminOrders(ordersData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les donnees admin');
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (authMode === 'register') {
        await register(username, password, email, phone);
        setNotice('Compte cree. Vous pouvez vous connecter.');
        setAuthMode('login');
      } else {
        const loggedUser = await login(loginIdentifier, password);
        setUser(loggedUser);
        setNotice(`Bienvenue ${loggedUser.username}`);
      }
      setPassword('');
      setEmail('');
      setPhone('');
      setUsername('');
      setLoginIdentifier('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentification impossible');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    if (product.quantity <= 0) return;

    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) }
            : item,
        );
      }

      return [...items, { product, quantity: 1 }];
    });
  }

  function updateCart(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((items) => items.filter((item) => item.product.id !== productId));
      return;
    }

    setCart((items) =>
      items
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.quantity)) }
            : item,
        )
    );
  }

  async function submitOrder() {
    if (!user) {
      setError('Connectez-vous pour valider une commande.');
      return;
    }

    if (cart.length === 0) {
      setError('Votre panier est vide.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      await createOrder(
        user.accessToken,
        cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        paymentMethod,
      );
      setCart([]);
      setNotice('Commande envoyee.');
      await loadProducts();
      if (user.role === 'admin') {
        await loadAdminData(user.accessToken);
      } else {
        await loadOrders(user.accessToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commande impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(orderId: string) {
    if (!user) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      await cancelOrder(user.accessToken, orderId);
      setNotice('Commande annulee.');
      await loadProducts();
      if (user.role === 'admin') {
        await loadAdminData(user.accessToken);
      } else {
        await loadOrders(user.accessToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annulation impossible');
    } finally {
      setLoading(false);
    }
  }

  function openAdmin() {
    window.location.hash = 'admin';
    setSpace('admin');
  }

  function openStore() {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    setSpace('store');
  }

  function logout() {
    setUser(null);
    setCart([]);
  }

  if (space === 'admin') {
    return <AdminPanel user={user} onLogin={setUser} onLogout={logout} onOpenStore={openStore} />;
  }

  return (
<<<<<<< HEAD
    <>
      <main className="app-shell">
        <header className="topbar">
          <div>
            <span className="brand-kicker">Auto Piece</span>
            <h1>{view === 'admin' ? 'Tableau de bord Admin' : 'Espace utilisateur'}</h1>
          </div>
=======
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="brand-kicker">Auto Piece</span>
          <h1>{view === 'admin' ? 'Tableau de bord Admin' : 'Espace utilisateur'}</h1>
        </div>
        <div className="topbar-actions">
          {user?.role === 'admin' && (
            <>
              <button
                className={`ghost-button ${view === 'admin' ? 'active' : ''}`}
                type="button"
                onClick={() => setView(view === 'admin' ? 'user' : 'admin')}
              >
                {view === 'admin' ? 'Voir Boutique' : 'Voir Admin'}
              </button>
              <button className="ghost-button" type="button" onClick={openAdmin}>
                Administration
              </button>
            </>
          )}
>>>>>>> origin/ilyas-rabaa
          {user ? (
            <div className="user-box">
              <span>{user.username}</span>
              <button
                className="ghost-button"
                type="button"
                onClick={logout}
              >
                Deconnexion
              </button>
              {user.role === 'admin' && (
                <button className="ghost-button" type="button" onClick={openAdmin}>
                  Administration
                </button>
              )}
            </div>
          ) : (
            <button className="ghost-button" type="button" onClick={openAdmin}>
              Administration
            </button>
          )}
<<<<<<< HEAD
        </header>
=======
        </div>
      </header>
>>>>>>> origin/ilyas-rabaa

        {(notice || error) && (
          <section className={`message ${error ? 'error' : 'success'}`}>
            {error || notice}
          </section>
        )}

        {view === 'admin' && user?.role === 'admin' ? (
          <section className="layout admin-layout">
            <div className="main-column">
              <section className="stats-grid">
                <div className="stat-card">
                  <h3>Produits</h3>
                  <p>{stats?.totalProducts || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Rupture de stock</h3>
                  <p className={stats?.outOfStock ? 'danger' : ''}>{stats?.outOfStock || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Commandes totales</h3>
                  <p>{stats?.totalOrders || 0}</p>
                </div>
              </section>

              <section className="orders-section">
                <div className="section-title">
                  <h2>Toutes les commandes</h2>
                  <button type="button" className="ghost-button" onClick={() => loadAdminData(user.accessToken)}>
                    Actualiser
                  </button>
                </div>
                {adminOrders.length === 0 && <p className="empty-state">Aucune commande.</p>}
                {adminOrders.map((order) => (
                  <article className="order-row" key={order.id}>
                    <div>
                      <strong>Commande #{order.id}</strong>
                      <span>Par: {order.username}</span>
                      <span>{new Date(order.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="order-items">
                      {order.items.map((item) => {
                        const product = productById.get(item.productId);
                        return (
                          <span key={`${order.id}-${item.productId}`}>
                            {product?.name ?? `Produit ${item.productId}`} x {item.quantity}
                          </span>
                        );
                      })}
                    </div>
                    <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                  </article>
                ))}
              </section>
            </div>
            <aside className="side-column">
              <div className="admin-actions-panel">
                <h2>Actions Rapides</h2>
                <p>Gestion des produits et stocks (Prochainement)</p>
                <button disabled className="ghost-button">Ajouter un produit</button>
                <button disabled className="ghost-button">Gérer les fournisseurs</button>
              </div>
            </aside>
          </section>
        ) : (
          <section className="layout">
            <div className="main-column">
              <section className="toolbar" aria-label="Recherche produits">
                <label>
                  Recherche
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nom ou description"
                  />
                </label>
                <label>
                  Categorie
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="">Toutes</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="product-grid" aria-label="Catalogue">
                {products.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="part-visual">
                      <span>{product.category.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="product-content">
                      <div>
                        <span className="category-pill">{product.category}</span>
                        <h2>{product.name}</h2>
                        <p>{product.description}</p>
                      </div>
                      <div className="product-meta">
                        <strong>{formatPrice(product.price)}</strong>
                        <span className={product.quantity > 0 ? 'stock' : 'stock empty'}>
                          {product.quantity > 0 ? `${product.quantity} en stock` : 'Rupture'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={product.quantity <= 0}
                        onClick={() => addToCart(product)}
                      >
                        Ajouter
                      </button>
                    </div>
                  </article>
                ))}
                {products.length === 0 && <p className="empty-state">Aucun produit trouve.</p>}
              </section>

              <section className="orders-section">
                <div className="section-title">
                  <h2>Mes commandes</h2>
                  {user && (
                    <button type="button" className="ghost-button" onClick={() => loadOrders(user.accessToken)}>
                      Actualiser
                    </button>
                  )}
                </div>
                {!user && <p className="empty-state">Connectez-vous pour suivre vos commandes.</p>}
                {user && orders.length === 0 && <p className="empty-state">Aucune commande pour le moment.</p>}
                {orders.map((order) => (
                  <article className="order-row" key={order.id}>
                    <div>
                      <strong>Commande #{order.id}</strong>
                      <span>{new Date(order.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="order-items">
                      {order.items.map((item) => {
                        const product = productById.get(item.productId);
                        return (
                          <span key={`${order.id}-${item.productId}`}>
                            {product?.name ?? `Produit ${item.productId}`} x {item.quantity}
                          </span>
                        );
                      })}
                    </div>
                    <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                    {order.status !== 'cancelled' && (
                      <button type="button" className="ghost-button danger" onClick={() => handleCancel(order.id)}>
                        Annuler
                      </button>
                    )}
                  </article>
                ))}
              </section>
            </div>

            <aside className="side-column">
              {!user && (
                <section className="auth-panel">
                  <div className="tabs">
                    <button
                      className={authMode === 'login' ? 'active' : ''}
                      type="button"
                      onClick={() => setAuthMode('login')}
                    >
                      Connexion
                    </button>
                    <button
                      className={authMode === 'register' ? 'active' : ''}
                      type="button"
                      onClick={() => setAuthMode('register')}
                    >
                      Inscription
                    </button>
                  </div>
                  <form onSubmit={handleAuth}>
                    {authMode === 'login' ? (
                      <label>
                        Utilisateur ou Email
                        <input value={loginIdentifier} onChange={(event) => setLoginIdentifier(event.target.value)} required />
                      </label>
                    ) : (
                      <>
                        <label>
                          Utilisateur
                          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
                        </label>
                        <label>
                          Email
                          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                        </label>
                        <label>
                          Telephone
                          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                        </label>
                      </>
                    )}
                    <label>
                      Mot de passe
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={4}
                        required
                      />
                    </label>
                    <button type="submit" disabled={loading}>
                      {authMode === 'login' ? 'Se connecter' : 'Creer le compte'}
                    </button>
                  </form>
                </section>
              )}

              <section className="cart-panel">
                <div className="section-title">
                  <h2>Panier</h2>
                  <span>{cart.length}</span>
                </div>
                {cart.length === 0 && <p className="empty-state">Votre panier est vide.</p>}
                {cart.map((item) => (
                  <div className="cart-line" key={item.product.id}>
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>{formatPrice(item.product.price)}</span>
                    </div>
                    <input
                      aria-label={`Quantite ${item.product.name}`}
                      type="number"
                      min="1"
                      max={item.product.quantity}
                      value={item.quantity}
                      onChange={(event) => updateCart(item.product.id, Number(event.target.value))}
                    />
                    <button type="button" className="icon-button" onClick={() => updateCart(item.product.id, 0)}>
                      x
                    </button>
                  </div>
                ))}
                <label>
                  Paiement
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option value="cash">Paiement a la livraison</option>
                    <option value="card">Carte bancaire</option>
                    <option value="transfer">Virement</option>
                  </select>
                </label>
                <div className="total-line">
                  <span>Total</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                <button type="button" disabled={loading || cart.length === 0} onClick={submitOrder}>
                  Valider la commande
                </button>
              </section>
            </aside>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Auto Piece</h3>
            <p>Votre partenaire pour toutes vos pièces détachées automobiles.</p>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <p>Email: contact@autopiece.com</p>
            <p>Tél: +33 1 23 45 67 89</p>
          </div>
          <div className="footer-section">
            <h3>Horaires</h3>
            <p>Lun - Ven: 08:00 - 18:00</p>
            <p>Sam: 09:00 - 12:00</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Auto Piece - Tous droits réservés</p>
        </div>
      </footer>
    </>
  );
}
