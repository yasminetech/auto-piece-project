import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  cancelOrder,
  createOrder,
  getAllOrders,
  getOrders,
  getProductDetails,
  getProducts,
  getStats,
  login,
  register,
  resolveMediaUrl,
  submitProductReview,
} from './api';
import AdminPanel from './AdminPanel';
import type { CartItem, Order, Product, ProductDetail, ProductMedia, ProductReview, User } from './types';

const storedUser = localStorage.getItem('auto-piece-user');
const initialUser = storedUser ? (JSON.parse(storedUser) as User) : null;
const BRAND_LOGO = '/admin-logo.jpeg';
const BRAND_ICON = '/admin-icon.jpeg';

type StoreTheme = 'dark' | 'light';
type StoreIconName =
  | 'admin'
  | 'arrow'
  | 'cart'
  | 'close'
  | 'menu'
  | 'moon'
  | 'play'
  | 'search'
  | 'shield'
  | 'spark'
  | 'star'
  | 'stock'
  | 'sun'
  | 'user';

function formatPrice(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatRating(value: number) {
  return value > 0 ? value.toFixed(1) : 'Nouveau';
}

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

function stockTone(quantity: number) {
  if (quantity <= 0) return 'empty';
  if (quantity <= 5) return 'low';
  return 'ready';
}

function categoryCode(category: string) {
  return category
    .split(/\s+/)
    .slice(0, 2)
    .map((token) => token[0] ?? '')
    .join('')
    .toUpperCase() || 'AP';
}

function mediaLooksLikeVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

function buildSpecs(product: Product) {
  return [
    { label: 'Categorie', value: product.category || 'Standard atelier' },
    { label: 'Fournisseur', value: product.supplierName || 'Reseau premium' },
    { label: 'Disponibilite', value: product.quantity > 0 ? `${product.quantity} unites` : 'Reassort requis' },
    { label: 'Logistique', value: product.quantity > 5 ? 'Expedition rapide' : 'Verification prioritaire' },
  ];
}

function StoreIcon({ name }: { name: StoreIconName }) {
  const common = {
    className: 'store-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.9,
    viewBox: '0 0 24 24',
  };

  const paths: Record<StoreIconName, ReactNode> = {
    admin: (
      <>
        <path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    cart: (
      <>
        <path d="M5 6h16l-2 9H7L5 3H2" />
        <path d="M8 21h.01" />
        <path d="M18 21h.01" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />,
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 9 5 3-5 3Z" />
      </>
    ),
    search: (
      <>
        <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 7v5c0 5-3.2 8-8 9-4.8-1-8-4-8-9V7l8-4Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
        <path d="m18 16 .7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7L18 16Z" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 9.4l6.1-.9L12 3Z" />
      </>
    ),
    stock: (
      <>
        <path d="M4 19h16" />
        <path d="M7 16V8" />
        <path d="M12 16V5" />
        <path d="M17 16v-4" />
      </>
    ),
    sun: (
      <>
        <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        <path d="M12 1v2" />
        <path d="M12 21v2" />
        <path d="M1 12h2" />
        <path d="M21 12h2" />
        <path d="m4.2 4.2 1.4 1.4" />
        <path d="m18.4 18.4 1.4 1.4" />
        <path d="m4.2 19.8 1.4-1.4" />
        <path d="m18.4 5.6 1.4-1.4" />
      </>
    ),
    user: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function RatingStars({ rating, muted = false }: { rating: number; muted?: boolean }) {
  return (
    <div className={`rating-stars ${muted ? 'muted' : ''}`} aria-label={`Note ${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < Math.round(rating) ? 'active' : ''}>
          <StoreIcon name="star" />
        </span>
      ))}
    </div>
  );
}

function ProductVisual({
  product,
  media,
  large = false,
}: {
  product: Product;
  media?: ProductMedia[];
  large?: boolean;
}) {
  const heroMedia = media?.[0];
  const visualUrl = heroMedia?.url || product.primaryImage || '';
  const resolvedVisualUrl = resolveMediaUrl(visualUrl);
  const isVideo = heroMedia?.kind === 'video' || mediaLooksLikeVideo(visualUrl);

  if (visualUrl && isVideo) {
    return (
      <div className={`product-visual ${large ? 'large' : ''}`}>
        <video src={resolvedVisualUrl} muted autoPlay loop playsInline controls={large} />
        <div className="visual-overlay">
          <span className="visual-tag">Preview video</span>
          <StoreIcon name="play" />
        </div>
      </div>
    );
  }

  if (visualUrl) {
    return (
      <div className={`product-visual ${large ? 'large' : ''}`}>
        <img
          src={resolvedVisualUrl}
          alt={heroMedia?.altText || product.name}
          loading={large ? 'eager' : 'lazy'}
          decoding="async"
        />
        <div className="visual-overlay">
          <span className="visual-tag">{product.category}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`product-visual placeholder ${large ? 'large' : ''}`}>
      <div className="placeholder-rings" />
      <div className="placeholder-badge">{categoryCode(product.category)}</div>
      <div className="placeholder-copy">
        <span>{product.category || 'Auto Piece'}</span>
        <strong>{product.name}</strong>
      </div>
    </div>
  );
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [storeTheme, setStoreTheme] = useState<StoreTheme>(() =>
    localStorage.getItem('auto-piece-store-theme') === 'dark' ? 'dark' : 'light',
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

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

  const availableProducts = useMemo(
    () => products.filter((product) => product.quantity > 0).length,
    [products],
  );

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.quantity > 0 && product.quantity <= 5).length,
    [products],
  );

  const outOfStockProducts = useMemo(
    () => products.filter((product) => product.quantity <= 0).length,
    [products],
  );

  const inventoryTotal = useMemo(
    () => products.reduce((total, product) => total + product.quantity, 0),
    [products],
  );

  const featuredProducts = useMemo(
    () =>
      [...products]
        .sort((first, second) => {
          const secondScore = (second.ratingAverage ?? 0) * 10 + second.quantity;
          const firstScore = (first.ratingAverage ?? 0) * 10 + first.quantity;
          return secondScore - firstScore;
        })
        .slice(0, 3),
    [products],
  );

  const selectedProduct = selectedProductId ? productById.get(selectedProductId) ?? null : products[0] ?? null;
  const selectedProductDetail = selectedProductId ? productDetails[selectedProductId] ?? null : null;
  const detailProduct = selectedProductDetail ?? selectedProduct;
  const detailMedia = selectedProductDetail?.media ?? [];
  const activeMedia = detailMedia[selectedMediaIndex] ?? detailMedia[0] ?? null;
  const reviewAverage = selectedProductDetail?.ratingAverage ?? selectedProduct?.ratingAverage ?? 0;
  const reviewCount = selectedProductDetail?.reviewCount ?? selectedProduct?.reviewCount ?? 0;

  const loadProducts = useCallback(async () => {
    try {
      setError('');
      const data = await getProducts(search, category);
      setProducts(data);
      setProductDetails((current) => {
        const next = { ...current };
        data.forEach((product) => {
          if (next[product.id]) {
            next[product.id] = { ...next[product.id], ...product };
          }
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les produits');
    }
  }, [search, category]);

  const loadProductDetails = useCallback(
    async (productId: string, force = false) => {
      if (!force && productDetails[productId]) {
        return productDetails[productId];
      }

      try {
        setDetailLoading(true);
        const detail = await getProductDetails(productId);
        setProductDetails((current) => ({ ...current, [productId]: detail }));
        return detail;
      } catch (err) {
        const fallbackProduct = products.find((product) => product.id === productId);
        if (!fallbackProduct) {
          setError(err instanceof Error ? err.message : 'Impossible de charger les details produit');
          return null;
        }

        const fallbackDetail: ProductDetail = {
          ...fallbackProduct,
          media: [],
          reviews: [],
          similarProducts: products
            .filter((product) => product.id !== productId && product.category === fallbackProduct.category)
            .slice(0, 4),
        };

        setProductDetails((current) => ({ ...current, [productId]: fallbackDetail }));
        return fallbackDetail;
      } finally {
        setDetailLoading(false);
      }
    },
    [productDetails, products],
  );

  async function loadOrders(token: string) {
    try {
      setError('');
      const data = await getOrders(token);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les commandes');
    }
  }

  async function loadAdminData(token: string) {
    try {
      setError('');
      const [ordersData, statsData] = await Promise.all([getAllOrders(token), getStats(token)]);
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
        const loggedUser = await login(email, password);
        setUser(loggedUser);
        setNotice(`Bienvenue ${loggedUser.username}`);
      }
      setPassword('');
      setEmail('');
      setPhone('');
      setUsername('');
      setMobileMenuOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentification impossible');
    } finally {
      setLoading(false);
    }
  }

  function openAdmin() {
    window.location.hash = 'admin';
    setSpace('admin');
    setMobileMenuOpen(false);
  }

  function openStore() {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    setSpace('store');
    setMobileMenuOpen(false);
  }

  function logout() {
    setUser(null);
    setCart([]);
    setMobileMenuOpen(false);
    openStore();
  }

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    void loadProductDetails(productId);
  }

  function addToCart(product: Product) {
    if (product.quantity <= 0) return;

    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) } : item,
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
      items.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.quantity)) }
          : item,
      ),
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
      if (selectedProductId) {
        await loadProductDetails(selectedProductId, true);
      }

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
      if (selectedProductId) {
        await loadProductDetails(selectedProductId, true);
      }

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

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setError('Connectez-vous pour partager un avis.');
      return;
    }

    if (!selectedProductId) return;

    setReviewLoading(true);
    setError('');
    setNotice('');

    try {
      await submitProductReview(user.accessToken, selectedProductId, reviewRating, reviewComment);
      setReviewComment('');
      setNotice('Avis enregistre avec succes.');
      await Promise.all([loadProducts(), loadProductDetails(selectedProductId, true)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avis impossible a enregistrer');
    } finally {
      setReviewLoading(false);
    }
  }

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
    void loadProducts();
  }, [search, category]);

  useEffect(() => {
    if (products.length === 0) {
      setSelectedProductId(null);
      return;
    }

    setSelectedProductId((current) =>
      current && products.some((product) => product.id === current) ? current : products[0].id,
    );
  }, [products]);

  useEffect(() => {
    if (!selectedProductId) return;
    void loadProductDetails(selectedProductId);
  }, [selectedProductId]);

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [selectedProductId]);

  useEffect(() => {
    localStorage.setItem('auto-piece-store-theme', storeTheme);
    document.body.dataset.storeTheme = storeTheme;
  }, [storeTheme]);

  // Scroll reveal observer for cinematic animations
  const revealObserverRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    revealObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserverRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    // Observe all reveal elements
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach((el) => revealObserverRef.current?.observe(el));

    return () => revealObserverRef.current?.disconnect();
  }, []);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    let rafId: number | null = null;
    let pendingY: number | null = null;

    const applyScrollState = (y: number) => {
      document.body.dataset.storeTopbarState = y > 40 ? 'compact' : 'expanded';

      // premium auto-hide/show on scroll direction
      const delta = y - lastY;
      const goingDown = delta > 8;
      const goingUp = delta < -8;
      const shouldHide = goingDown && y > 80;
      const shouldShow = goingUp;

      if (shouldHide) document.body.dataset.storeTopbarVisibility = 'hidden';
      if (shouldShow) document.body.dataset.storeTopbarVisibility = 'shown';

      lastY = y;
    };

    const onScroll = () => {
      const y = window.scrollY || 0;
      pendingY = y;

      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (pendingY != null) applyScrollState(pendingY);
        pendingY = null;
      });
    };

    document.body.dataset.storeTopbarVisibility = 'shown';
    applyScrollState(lastY);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auto-piece-user', JSON.stringify(user));
      if (user.role === 'admin') {
        setView('admin');
        void loadAdminData(user.accessToken);
      } else {
        setView('user');
        void loadOrders(user.accessToken);
      }
      return;
    }

    localStorage.removeItem('auto-piece-user');
    setOrders([]);
    setAdminOrders([]);
    setStats(null);
    setView('user');
  }, [user]);

  if (space === 'admin') {
    return <AdminPanel user={user} onLogin={setUser} onLogout={logout} onOpenStore={openStore} />;
  }

  return (
    <main className={`app-shell store-shell premium-storefront store-theme-${storeTheme}`}>
      <div className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      <header className="store-topbar">

        <div className="store-brand">
          <img src={BRAND_ICON} alt="Auto Piece" />
          <div>
            <span className="brand-kicker">Auto Piece Command</span>
            <h1>{view === 'admin' ? 'Operations commerciales connectees' : 'Catalogue premium pieces auto'}</h1>
          </div>
        </div>

        <nav className="store-nav" aria-label="Navigation boutique">
          <button type="button" className="ghost-button" onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}>
            Catalogue
          </button>
          <button type="button" className="ghost-button" onClick={() => document.getElementById('product-focus')?.scrollIntoView({ behavior: 'smooth' })}>
            Fiche produit
          </button>
          <button type="button" className="ghost-button" onClick={() => document.getElementById('orders-zone')?.scrollIntoView({ behavior: 'smooth' })}>
            Commandes
          </button>
        </nav>

        <div className="topbar-actions desktop-actions">
          <button
            className="ghost-button icon-text-button"
            type="button"
            onClick={() => setStoreTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            <StoreIcon name={storeTheme === 'dark' ? 'sun' : 'moon'} />
            Theme
          </button>
          {user?.role === 'admin' && (
            <>
              <button
                className={`ghost-button ${view === 'admin' ? 'active' : ''}`}
                type="button"
                onClick={() => setView(view === 'admin' ? 'user' : 'admin')}
              >
                {view === 'admin' ? 'Mode boutique' : 'Mode operations'}
              </button>
              <button className="ghost-button" type="button" onClick={openAdmin}>
                <StoreIcon name="admin" />
                Administration
              </button>
            </>
          )}
          {user ? (
            <div className="user-box glass-chip">
              <span>{user.username}</span>
              <small>{user.role}</small>
              <button className="ghost-button" type="button" onClick={logout}>
                Deconnexion
              </button>
            </div>
          ) : (
            <button className="ghost-button" type="button" onClick={openAdmin}>
              <StoreIcon name="admin" />
              Administration
            </button>
          )}
          <button className="ghost-button cart-counter-button" type="button" onClick={() => document.getElementById('cart-zone')?.scrollIntoView({ behavior: 'smooth' })}>
            <StoreIcon name="cart" />
            {cart.length}
          </button>
        </div>

        <button className="mobile-nav-button" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Ouvrir le menu">
          <StoreIcon name="menu" />
        </button>
      </header>

      <aside className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="drawer-head">
          <div>
            <span className="brand-kicker">Auto Piece</span>
            <strong>Navigation rapide</strong>
          </div>
          <button className="ghost-button icon-only-button" type="button" onClick={() => setMobileMenuOpen(false)}>
            <StoreIcon name="close" />
          </button>
        </div>
        <div className="drawer-actions">
          <button className="ghost-button" type="button" onClick={() => { document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}>
            Catalogue
          </button>
          <button className="ghost-button" type="button" onClick={() => { document.getElementById('product-focus')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}>
            Fiche produit
          </button>
          <button className="ghost-button" type="button" onClick={() => { document.getElementById('orders-zone')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}>
            Commandes
          </button>
          <button className="ghost-button" type="button" onClick={() => setStoreTheme((current) => (current === 'dark' ? 'light' : 'dark'))}>
            <StoreIcon name={storeTheme === 'dark' ? 'sun' : 'moon'} />
            Theme
          </button>
          <button className="ghost-button" type="button" onClick={openAdmin}>
            <StoreIcon name="admin" />
            Administration
          </button>
          {user ? (
            <button className="ghost-button" type="button" onClick={logout}>
              Deconnexion
            </button>
          ) : null}
        </div>
      </aside>

      <section className="store-hero reveal-on-scroll">
        <article className="hero-copy glass-panel">
          <div className="hero-particles" aria-hidden="true">
            <span className="hero-particle" />
            <span className="hero-particle delay-2" />
            <span className="hero-particle delay-4" />
          </div>
          <span className="hero-kicker hero-cinematic-title">Futuristic automotive commerce</span>
          <h2 className="hero-cinematic-title">Un ecosysteme stock, vente et pilotage pense comme une plateforme SaaS premium.</h2>
          <p className="hero-cinematic-subtitle">
            Catalogue commercial, disponibilite atelier, transitions boutique-admin et fiches produits riches
            dans une seule interface fluide.
          </p>
          <div className="hero-actions hero-cinematic-actions">
            <button type="button" className="cta-premium" onClick={() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })}>
              Explorer le catalogue
              <StoreIcon name="arrow" />
            </button>
            {detailProduct && (
              <button className="ghost-button cta-ghost-premium" type="button" onClick={() => document.getElementById('product-focus')?.scrollIntoView({ behavior: 'smooth' })}>
                Voir la fiche premium
              </button>
            )}
          </div>
          <div className="hero-stat-grid">
            <article className="stat-card-premium reveal-delay-1">
              <span>Inventaire</span>
              <strong>{inventoryTotal}</strong>
              <small>pieces actives</small>
            </article>
            <article className="stat-card-premium reveal-delay-2">
              <span>Disponibles</span>
              <strong>{availableProducts}</strong>
              <small>references pretes</small>
            </article>
            <article className="stat-card-premium reveal-delay-3">
              <span>Stock faible</span>
              <strong>{lowStockProducts}</strong>
              <small>controle prioritaire</small>
            </article>
            <article className="stat-card-premium reveal-delay-4">
              <span>Reviews live</span>
              <strong>{products.reduce((total, product) => total + (product.reviewCount ?? 0), 0)}</strong>
              <small>signaux clients</small>
            </article>
          </div>
        </article>

        <article className="hero-stage glass-panel neon-border" id="product-focus">
          {detailProduct ? (
            <>
              <div className="hero-stage-head">
                <span className="section-kicker">Focus produit</span>
                <span className={`stock-badge ${stockTone(detailProduct.quantity)}`}>
                  {detailProduct.quantity > 0 ? `${detailProduct.quantity} en stock` : 'Rupture'}
                </span>
              </div>
              <ProductVisual product={detailProduct} media={selectedProductDetail?.media} large />
              <div className="hero-stage-body">
                <div>
                  <span className="category-pill accent">{detailProduct.category}</span>
                  <h3>{detailProduct.name}</h3>
                  <p>{detailProduct.description}</p>
                </div>
                <div className="detail-score-row">
                  <div>
                    <strong>{formatPrice(detailProduct.price)}</strong>
                    <span>{detailProduct.supplierName || 'Reseau partenaire premium'}</span>
                  </div>
                  <div className="rating-block">
                    <RatingStars rating={reviewAverage} />
                    <b>{formatRating(reviewAverage)}</b>
                    <small>{reviewCount} avis</small>
                  </div>
                </div>
                <div className="detail-chip-row">
                  {buildSpecs(detailProduct).map((spec) => (
                    <span key={spec.label} className="detail-chip">
                      <strong>{spec.label}</strong>
                      <small>{spec.value}</small>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-focus">
              <StoreIcon name="spark" />
              <p>Selectionnez une reference pour ouvrir la fiche detaillee.</p>
            </div>
          )}
        </article>
      </section>

      <section className="category-strip">
        <button
          type="button"
          className={`category-chip ${category === '' ? 'active' : ''}`}
          onClick={() => setCategory('')}
        >
          Toutes
        </button>
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={`category-chip ${category === item ? 'active' : ''}`}
            onClick={() => setCategory((current) => (current === item ? '' : item))}
          >
            {item}
          </button>
        ))}
      </section>

      {(notice || error) && (
        <section className={`message ${error ? 'error' : 'success'}`}>
          {error || notice}
        </section>
      )}

      {view === 'admin' && user?.role === 'admin' && (
        <section className="operations-hub">
          <div className="operations-stat-grid">
            <article className="glass-panel">
              <span>Produits</span>
              <strong>{stats?.totalProducts || products.length}</strong>
              <small>catalogue global</small>
            </article>
            <article className="glass-panel">
              <span>Rupture</span>
              <strong>{stats?.outOfStock || outOfStockProducts}</strong>
              <small>references indisponibles</small>
            </article>
            <article className="glass-panel">
              <span>Commandes</span>
              <strong>{stats?.totalOrders || adminOrders.length}</strong>
              <small>activite commerciale</small>
            </article>
            <article className="glass-panel">
              <span>Passerelle</span>
              <strong>Store ↔ Admin</strong>
              <small>ecosysteme unifie</small>
            </article>
          </div>

          <div className="operations-grid">
            <section className="glass-panel">
              <div className="section-title">
                <div>
                  <span className="section-kicker">Centre operations</span>
                  <h2>Commandes recentes</h2>
                </div>
                <button type="button" className="ghost-button" onClick={() => loadAdminData(user.accessToken)}>
                  Actualiser
                </button>
              </div>
              <div className="order-stack compact">
                {adminOrders.slice(0, 5).map((order) => (
                  <article className="order-card" key={order.id}>
                    <div>
                      <strong>Commande #{order.id}</strong>
                      <span>Par {order.username}</span>
                    </div>
                    <div>
                      <small>{new Date(order.date).toLocaleDateString('fr-FR')}</small>
                      <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                    </div>
                  </article>
                ))}
                {adminOrders.length === 0 && <p className="empty-state">Aucune commande admin pour le moment.</p>}
              </div>
            </section>

            <section className="glass-panel">
              <div className="section-title">
                <div>
                  <span className="section-kicker">Passage premium</span>
                  <h2>Acces panneau admin</h2>
                </div>
              </div>
              <p className="support-copy">
                Le mode operations garde la meme identite visuelle que la boutique, puis bascule vers l’interface
                admin specialisee sans rupture.
              </p>
              <div className="hero-actions compact-actions">
                <button type="button" onClick={openAdmin}>
                  Ouvrir administration
                  <StoreIcon name="arrow" />
                </button>
                <button className="ghost-button" type="button" onClick={() => setView('user')}>
                  Retour boutique
                </button>
              </div>
            </section>
          </div>
        </section>
      )}

      <section className="store-layout" id="catalogue">
        <div className="main-column">
          <section className="glass-panel toolbar premium-toolbar" aria-label="Recherche produits">
            <label>
              Recherche
              <StoreIcon name="search" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, description, reference"
              />
            </label>
            <label>
              Categorie
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Toutes les lignes</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="toolbar-note">
              <span>{products.length} references visibles</span>
              <small>Catalogue reactif, detail premium, avis moderes</small>
            </div>
          </section>

          <section className="featured-row">
            {featuredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`featured-card glass-panel ${selectedProductId === product.id ? 'active' : ''}`}
                onClick={() => selectProduct(product.id)}
              >
                <ProductVisual product={product} />
                <div>
                  <span className="category-pill">{product.category}</span>
                  <strong>{product.name}</strong>
                  <small>{product.supplierName || 'Premium supply chain'}</small>
                </div>
                <div className="featured-card-meta">
                  <b>{formatPrice(product.price)}</b>
                  <RatingStars rating={product.ratingAverage ?? 0} muted />
                </div>
              </button>
            ))}
          </section>

          <section className="product-grid premium-product-grid" aria-label="Catalogue">
            {products.map((product) => (
              <article
                className={`product-card premium-product-card ${selectedProductId === product.id ? 'active' : ''}`}
                key={product.id}
              >
                <ProductVisual product={product} />
                <div className="product-content">
                  <div className="product-copy">
                    <div className="product-copy-head">
                      <span className="category-pill">{product.category}</span>
                      <span className={`stock-badge ${stockTone(product.quantity)}`}>
                        {product.quantity > 0 ? `${product.quantity} en stock` : 'Rupture'}
                      </span>
                    </div>
                    <h2>{product.name}</h2>
                    <p>{product.description}</p>
                  </div>
                  <div className="product-signal-row">
                    <div className="rating-block left">
                      <RatingStars rating={product.ratingAverage ?? 0} muted />
                      <span>{formatRating(product.ratingAverage ?? 0)}</span>
                    </div>
                    <span className="supplier-tag">{product.supplierName || 'Auto Piece Network'}</span>
                  </div>
                  <div className="product-meta">
                    <strong>{formatPrice(product.price)}</strong>
                    <span className="meta-caption">{product.reviewCount ?? 0} avis visibles</span>
                  </div>
                  <div className="product-actions">
                    <button type="button" className="ghost-button" onClick={() => selectProduct(product.id)}>
                      Voir details
                    </button>
                    <button
                      type="button"
                      disabled={product.quantity <= 0}
                      onClick={() => addToCart(product)}
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {products.length === 0 && <p className="empty-state">Aucun produit trouve.</p>}
          </section>

          <section className="glass-panel orders-section premium-orders" id="orders-zone">
            <div className="section-title">
              <div>
                <span className="section-kicker">Suivi commercial</span>
                <h2>{user?.role === 'admin' && view === 'admin' ? 'Flux commandes boutique' : 'Mes commandes'}</h2>
              </div>
              {user && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    user.role === 'admin' && view === 'admin'
                      ? loadAdminData(user.accessToken)
                      : loadOrders(user.accessToken)
                  }
                >
                  Actualiser
                </button>
              )}
            </div>
            {!user && <p className="empty-state">Connectez-vous pour suivre vos commandes et publier vos avis.</p>}
            {user && user.role === 'admin' && view === 'admin' ? (
              <div className="order-stack">
                {adminOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div>
                      <strong>Commande #{order.id}</strong>
                      <span>Par {order.username}</span>
                    </div>
                    <div className="order-card-items">
                      {order.items.map((item) => {
                        const product = productById.get(item.productId);
                        return (
                          <span key={`${order.id}-${item.productId}`}>
                            {product?.name ?? `Produit ${item.productId}`} x {item.quantity}
                          </span>
                        );
                      })}
                    </div>
                    <div className="order-card-foot">
                      <small>{new Date(order.date).toLocaleDateString('fr-FR')}</small>
                      <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                    </div>
                  </article>
                ))}
                {adminOrders.length === 0 && <p className="empty-state">Aucune commande a afficher.</p>}
              </div>
            ) : (
              <div className="order-stack">
                {user && orders.length === 0 && <p className="empty-state">Aucune commande pour le moment.</p>}
                {orders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div>
                      <strong>Commande #{order.id}</strong>
                      <span>{new Date(order.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="order-card-items">
                      {order.items.map((item) => {
                        const product = productById.get(item.productId);
                        return (
                          <span key={`${order.id}-${item.productId}`}>
                            {product?.name ?? `Produit ${item.productId}`} x {item.quantity}
                          </span>
                        );
                      })}
                    </div>
                    <div className="order-card-foot">
                      <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                      {order.status !== 'cancelled' && (
                        <button type="button" className="ghost-button danger" onClick={() => handleCancel(order.id)}>
                          Annuler
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="side-column detail-column">
          <section className="glass-panel detail-panel">
            <div className="section-title">
              <div>
                <span className="section-kicker">Product detail page</span>
                <h2>{detailProduct?.name || 'Selection produit'}</h2>
              </div>
              {detailLoading && <span className="loading-chip">Chargement...</span>}
            </div>

            {detailProduct ? (
              <>
                <div className="detail-hero-visual">
                  <ProductVisual product={detailProduct} media={activeMedia ? [activeMedia] : detailMedia} large />
                </div>

                {detailMedia.length > 0 && (
                  <div className="media-gallery">
                    {detailMedia.map((media, index) => (
                      <button
                        key={media.id}
                        type="button"
                        className={index === selectedMediaIndex ? 'active' : ''}
                        onClick={() => setSelectedMediaIndex(index)}
                      >
                        {media.kind === 'video' ? (
                          <span className="gallery-video-thumb">
                            <StoreIcon name="play" />
                          </span>
                        ) : (
                          <img
                            src={resolveMediaUrl(media.url)}
                            alt={media.altText || detailProduct.name}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="detail-overview">
                  <div className="detail-heading">
                    <span className="category-pill accent">{detailProduct.category}</span>
                    <span className={`stock-badge ${stockTone(detailProduct.quantity)}`}>
                      {detailProduct.quantity > 0 ? `${detailProduct.quantity} unites` : 'Indisponible'}
                    </span>
                  </div>
                  <p>{detailProduct.description}</p>
                  <div className="detail-price-row">
                    <strong>{formatPrice(detailProduct.price)}</strong>
                    <div className="rating-block">
                      <RatingStars rating={reviewAverage} />
                      <b>{formatRating(reviewAverage)}</b>
                      <small>{reviewCount} avis</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={detailProduct.quantity <= 0}
                    onClick={() => addToCart(detailProduct)}
                  >
                    Ajouter au panier
                  </button>
                </div>

                <div className="spec-grid">
                  {buildSpecs(detailProduct).map((spec) => (
                    <article key={spec.label} className="spec-card">
                      <span>{spec.label}</span>
                      <strong>{spec.value}</strong>
                    </article>
                  ))}
                </div>

                <section className="detail-section">
                  <div className="section-title compact-section-title">
                    <div>
                      <span className="section-kicker">Supplier + service</span>
                      <h3>Informations commerciales</h3>
                    </div>
                  </div>
                  <div className="detail-chip-row">
                    <span className="detail-chip">
                      <strong>Fournisseur</strong>
                      <small>{detailProduct.supplierName || 'Rattachement a definir'}</small>
                    </span>
                    <span className="detail-chip">
                      <strong>Paiement</strong>
                      <small>Livraison, carte, virement</small>
                    </span>
                    <span className="detail-chip">
                      <strong>Support</strong>
                      <small>Validation atelier et assistance stock</small>
                    </span>
                  </div>
                </section>

                <section className="detail-section">
                  <div className="section-title compact-section-title">
                    <div>
                      <span className="section-kicker">Customer reviews</span>
                      <h3>Avis et notation</h3>
                    </div>
                  </div>
                  <div className="review-summary">
                    <div>
                      <strong>{formatRating(reviewAverage)}</strong>
                      <span>Moyenne client</span>
                    </div>
                    <RatingStars rating={reviewAverage} />
                    <small>{reviewCount} avis moderes</small>
                  </div>
                  <div className="review-list">
                    {selectedProductDetail?.reviews.map((review) => (
                      <article className="review-card" key={review.id}>
                        <div className="review-head">
                          <div>
                            <strong>{review.username}</strong>
                            <span>{formatReviewDate(review.updatedAt)}</span>
                          </div>
                          <RatingStars rating={review.rating} muted />
                        </div>
                        <p>{review.comment || 'Aucun commentaire detaille.'}</p>
                      </article>
                    ))}
                    {selectedProductDetail && selectedProductDetail.reviews.length === 0 && (
                      <p className="empty-state">Aucun avis visible pour cette reference.</p>
                    )}
                  </div>

                  {user ? (
                    <form className="review-form" onSubmit={handleReviewSubmit}>
                      <div className="review-stars-picker" role="radiogroup" aria-label="Votre note">
                        {Array.from({ length: 5 }, (_, index) => {
                          const value = index + 1;
                          return (
                            <button
                              key={value}
                              type="button"
                              className={reviewRating >= value ? 'active' : ''}
                              onClick={() => setReviewRating(value)}
                            >
                              <StoreIcon name="star" />
                            </button>
                          );
                        })}
                      </div>
                      <label>
                        Commentaire
                        <textarea
                          rows={4}
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="Retour atelier, compatibilite, qualite, delai..."
                        />
                      </label>
                      <button type="submit" disabled={reviewLoading}>
                        {reviewLoading ? 'Envoi...' : 'Publier mon avis'}
                      </button>
                    </form>
                  ) : (
                    <p className="empty-state">Connectez-vous pour noter cette piece et partager votre retour.</p>
                  )}
                </section>

                <section className="detail-section">
                  <div className="section-title compact-section-title">
                    <div>
                      <span className="section-kicker">Similar products</span>
                      <h3>References proches</h3>
                    </div>
                  </div>
                  <div className="similar-grid">
                    {selectedProductDetail?.similarProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="similar-card"
                        onClick={() => selectProduct(product.id)}
                      >
                        <ProductVisual product={product} />
                        <strong>{product.name}</strong>
                        <small>{formatPrice(product.price)}</small>
                      </button>
                    ))}
                    {selectedProductDetail && selectedProductDetail.similarProducts.length === 0 && (
                      <p className="empty-state">Pas encore de reference similaire dans cette categorie.</p>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="empty-focus">
                <StoreIcon name="spark" />
                <p>Le detail produit apparaitra ici avec galerie, reviews et recommandations.</p>
              </div>
            )}
          </section>

          {!user && (
            <section className="glass-panel auth-panel premium-auth-panel">
              <div className="section-title compact-section-title">
                <div>
                  <span className="section-kicker">Acces client</span>
                  <h2>{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
                </div>
              </div>
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
                    Identifiant
                    <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
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

          <section className="glass-panel cart-panel premium-cart-panel" id="cart-zone">
            <div className="section-title compact-section-title">
              <div>
                <span className="section-kicker">Smart cart</span>
                <h2>Panier</h2>
              </div>
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

      <footer className="store-footer premium-footer reveal-on-scroll">
        <div className="footer-main">
          <div className="footer-brand">
            <img src={BRAND_LOGO} alt="Auto Piece" />
            <div>
              <strong>Auto Piece Command</strong>
              <span>Plateforme premium de gestion stock et commerce automobile</span>
            </div>
          </div>
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Contact</h4>
              <span>+33 1 23 45 67 89</span>
              <span>contact@autopiece.com</span>
              <span>12 Rue de l'Automobile, Paris</span>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <span>Catalogue pieces</span>
              <span>Gestion stock</span>
              <span>Fournisseurs</span>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <span>Conditions generales</span>
              <span>Politique confidentialite</span>
              <span>Mentions legales</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 - 2027 Auto Piece Command. Tous droits reserves.</span>
          <div className="footer-actions">
            <button className="ghost-button" type="button" onClick={openAdmin}>
              <StoreIcon name="admin" />
              Admin
            </button>
            <button className="ghost-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Haut de page
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
