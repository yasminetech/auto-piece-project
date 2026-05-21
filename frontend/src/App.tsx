import { FormEvent, useEffect, useMemo, useState } from 'react';
import { cancelOrder, createOrder, getOrders, getProducts, login, register } from './api';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
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
    loadProducts();
  }, [search, category]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auto-piece-user', JSON.stringify(user));
      loadOrders(user.accessToken);
      return;
    }

    localStorage.removeItem('auto-piece-user');
    setOrders([]);
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

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (authMode === 'register') {
        await register(username, password);
        setNotice('Compte cree. Vous pouvez vous connecter.');
        setAuthMode('login');
      } else {
        const loggedUser = await login(username, password);
        setUser(loggedUser);
        setNotice(`Bienvenue ${loggedUser.username}`);
      }
      setPassword('');
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
      await loadOrders(user.accessToken);
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
      await loadOrders(user.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annulation impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="brand-kicker">Auto Piece</span>
          <h1>Espace utilisateur</h1>
        </div>
        {user ? (
          <div className="user-box">
            <span>{user.username}</span>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setUser(null);
                setCart([]);
              }}
            >
              Deconnexion
            </button>
          </div>
        ) : (
          <span className="session-state">Invite</span>
        )}
      </header>

      {(notice || error) && (
        <section className={`message ${error ? 'error' : 'success'}`}>
          {error || notice}
        </section>
      )}

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
              <label>
                Utilisateur
                <input value={username} onChange={(event) => setUsername(event.target.value)} required />
              </label>
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
    </main>
  );
}
