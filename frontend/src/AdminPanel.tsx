import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  adjustStock,
  createAdminProduct,
  createSupplier,
  deleteAdminProduct,
  deleteSupplier,
  getDashboardStats,
  getProducts,
  getStockMovements,
  getSuppliers,
  login,
  updateAdminProduct,
  updateSupplier,
} from './api';
import type { DashboardStats, Product, StockMovement, Supplier, User } from './types';

type AdminPanelProps = {
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onOpenStore: () => void;
};

type AdminSection = 'dashboard' | 'products' | 'stock' | 'suppliers' | 'alerts';
type AdminAuthMode = 'login' | 'forgot' | 'reset';

type ProductForm = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  supplierId: string;
  category: string;
};

type SupplierForm = {
  name: string;
  contact: string;
};

type StockForm = {
  productId: string;
  type: 'entry' | 'exit';
  quantity: string;
  description: string;
};

const LOW_STOCK_LIMIT = 5;

const emptyProductForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  quantity: '',
  supplierId: '',
  category: '',
};

const emptySupplierForm: SupplierForm = {
  name: '',
  contact: '',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function movementLabel(type: string) {
  return type === 'entry' ? 'Entree' : 'Sortie';
}

function stockClass(product: Product) {
  if (product.quantity === 0) return 'stock empty';
  if (product.quantity <= LOW_STOCK_LIMIT) return 'stock critical';
  return 'stock';
}

export default function AdminPanel({ user, onLogin, onLogout, onOpenStore }: AdminPanelProps) {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [authMode, setAuthMode] = useState<AdminAuthMode>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [stockForm, setStockForm] = useState<StockForm>({
    productId: '',
    type: 'entry',
    quantity: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const token = user?.accessToken ?? '';

  const productById = useMemo(
    () => new Map(allProducts.map((product) => [product.id, product])),
    [allProducts],
  );

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );

  const productCategories = useMemo(
    () => Array.from(new Set(allProducts.map((product) => product.category))).filter(Boolean),
    [allProducts],
  );

  const criticalProducts = useMemo(
    () => allProducts.filter((product) => product.quantity <= 2),
    [allProducts],
  );

  const lowStockProducts = useMemo(
    () =>
      allProducts.filter((product) => product.quantity > 2 && product.quantity <= LOW_STOCK_LIMIT),
    [allProducts],
  );

  const stockAlertProducts = useMemo(
    () => allProducts.filter((product) => product.quantity <= LOW_STOCK_LIMIT),
    [allProducts],
  );

  const movementHistory = useMemo(() => [...movements].reverse(), [movements]);

  const categoryStats = useMemo(() => {
    const totals = new Map<string, number>();
    allProducts.forEach((product) => {
      const category = product.category || 'Sans categorie';
      totals.set(category, (totals.get(category) ?? 0) + product.quantity);
    });

    const max = Math.max(1, ...Array.from(totals.values()));

    return Array.from(totals.entries()).map(([category, total]) => ({
      category,
      total,
      width: Math.max(8, Math.round((total / max) * 100)),
    }));
  }, [allProducts]);

  const selectedProduct = selectedProductId ? productById.get(selectedProductId) : allProducts[0];

  useEffect(() => {
    if (!isAdmin) return;

    void loadAdminData();
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isAdmin) return;

    void loadProducts();
  }, [isAdmin, productSearch, productCategory]);

  useEffect(() => {
    if (allProducts.length === 0) {
      setSelectedProductId('');
      setStockForm((current) => ({ ...current, productId: '' }));
      return;
    }

    setSelectedProductId((current) =>
      current && allProducts.some((product) => product.id === current) ? current : allProducts[0].id,
    );
    setStockForm((current) =>
      current.productId && allProducts.some((product) => product.id === current.productId)
        ? current
        : { ...current, productId: allProducts[0].id },
    );
  }, [allProducts]);

  async function loadAdminData() {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const [productData, supplierData, movementData, dashboardData] = await Promise.all([
        getProducts(),
        getSuppliers(token),
        getStockMovements(token),
        getDashboardStats(token),
      ]);

      setAllProducts(productData);
      setSuppliers(supplierData);
      setMovements(movementData);
      setDashboard(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les donnees admin');
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const productData = await getProducts(productSearch, productCategory);
      setProducts(productData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les produits');
    }
  }

  async function refreshAdmin() {
    await loadAdminData();
    await loadProducts();
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (authMode === 'login') {
        const loggedUser = await login(authUsername, authPassword);

        if (loggedUser.role !== 'admin') {
          throw new Error('Acces reserve aux administrateurs');
        }

        onLogin(loggedUser);
        setAuthPassword('');
        setNotice(`Bienvenue ${loggedUser.username}`);
        return;
      }

      if (authMode === 'forgot') {
        setNotice('La route backend de recuperation du mot de passe n est pas disponible.');
        return;
      }

      setResetToken('');
      setNewPassword('');
      setNotice('La route backend de reinitialisation du mot de passe n est pas disponible.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentification admin impossible');
    } finally {
      setLoading(false);
    }
  }

  function updateProductForm(field: keyof ProductForm, value: string) {
    setProductForm((current) => ({ ...current, [field]: value }));
  }

  function updateSupplierForm(field: keyof SupplierForm, value: string) {
    setSupplierForm((current) => ({ ...current, [field]: value }));
  }

  function updateStockForm(field: keyof StockForm, value: string) {
    setStockForm((current) => ({ ...current, [field]: value }));
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  }

  function resetSupplierForm() {
    setEditingSupplierId(null);
    setSupplierForm(emptySupplierForm);
  }

  function getProductPayload() {
    const price = Number(productForm.price);
    const quantity = Number(productForm.quantity);

    if (
      !productForm.name.trim() ||
      !productForm.description.trim() ||
      !productForm.category.trim() ||
      !Number.isFinite(price) ||
      !Number.isFinite(quantity) ||
      price < 0 ||
      quantity < 0
    ) {
      return null;
    }

    return {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price,
      quantity,
      supplierId: productForm.supplierId || undefined,
      category: productForm.category.trim(),
    };
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const payload = getProductPayload();
    if (!payload) {
      setError('Verifiez le nom, la description, le prix, la quantite et la categorie.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (editingProductId) {
        await updateAdminProduct(token, editingProductId, payload);
        setNotice('Produit modifie.');
      } else {
        await createAdminProduct(token, payload);
        setNotice('Produit ajoute.');
      }

      resetProductForm();
      await refreshAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement produit impossible');
    } finally {
      setLoading(false);
    }
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setSelectedProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      quantity: String(product.quantity),
      supplierId: product.supplierId ?? '',
      category: product.category,
    });
  }

  async function handleDeleteProduct(product: Product) {
    if (!token || !window.confirm(`Supprimer ${product.name} ?`)) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      await deleteAdminProduct(token, product.id);
      setNotice('Produit supprime.');
      await refreshAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression produit impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleSupplierSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const payload = {
      name: supplierForm.name.trim(),
      contact: supplierForm.contact.trim(),
    };

    if (!payload.name || !payload.contact) {
      setError('Verifiez le nom et le contact fournisseur.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (editingSupplierId) {
        await updateSupplier(token, editingSupplierId, payload);
        setNotice('Fournisseur modifie.');
      } else {
        await createSupplier(token, payload);
        setNotice('Fournisseur ajoute.');
      }

      resetSupplierForm();
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement fournisseur impossible');
    } finally {
      setLoading(false);
    }
  }

  function startEditSupplier(supplier: Supplier) {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      contact: supplier.contact,
    });
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    if (!token || !window.confirm(`Supprimer ${supplier.name} ?`)) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      await deleteSupplier(token, supplier.id);
      setNotice('Fournisseur supprime.');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression fournisseur impossible');
    } finally {
      setLoading(false);
    }
  }

  async function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const quantity = Number(stockForm.quantity);
    if (!stockForm.productId || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Choisissez un produit et une quantite valide.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      await adjustStock(token, {
        productId: stockForm.productId,
        type: stockForm.type,
        quantity,
        description: stockForm.description.trim() || 'Ajustement manuel',
      });

      setNotice(stockForm.type === 'entry' ? 'Entree stock enregistree.' : 'Sortie stock enregistree.');
      setStockForm((current) => ({ ...current, quantity: '', description: '' }));
      await refreshAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajustement stock impossible');
    } finally {
      setLoading(false);
    }
  }

  function supplierName(product: Product) {
    if (!product.supplierId) return 'Non assigne';
    return supplierById.get(product.supplierId)?.name ?? `Fournisseur ${product.supplierId}`;
  }

  function renderAuthPanel() {
    return (
      <main className="app-shell admin-shell">
        <header className="topbar admin-topbar">
          <div>
            <span className="brand-kicker">Auto Piece</span>
            <h1>Administration</h1>
          </div>
          <div className="user-box">
            <button className="ghost-button" type="button" onClick={onOpenStore}>
              Boutique
            </button>
            {user && (
              <button className="ghost-button" type="button" onClick={onLogout}>
                Deconnexion
              </button>
            )}
          </div>
        </header>

        {(notice || error) && (
          <section className={`message ${error ? 'error' : 'success'}`}>
            {error || notice}
          </section>
        )}

        {user && user.role !== 'admin' && (
          <section className="message error">Votre role actuel ne permet pas d ouvrir l administration.</section>
        )}

        <section className="admin-auth-layout">
          <section className="auth-panel admin-auth-panel">
            <div className="tabs">
              <button
                className={authMode === 'login' ? 'active' : ''}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                Connexion
              </button>
              <button
                className={authMode === 'forgot' ? 'active' : ''}
                type="button"
                onClick={() => setAuthMode('forgot')}
              >
                Mot de passe
              </button>
              <button
                className={authMode === 'reset' ? 'active' : ''}
                type="button"
                onClick={() => setAuthMode('reset')}
              >
                Reset
              </button>
            </div>
            <form onSubmit={handleAuth}>
              {authMode === 'login' && (
                <>
                  <label>
                    Administrateur
                    <input
                      value={authUsername}
                      onChange={(event) => setAuthUsername(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Mot de passe
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      minLength={4}
                      required
                    />
                  </label>
                  <button type="submit" disabled={loading}>
                    Se connecter
                  </button>
                </>
              )}

              {authMode === 'forgot' && (
                <>
                  <label>
                    Utilisateur
                    <input
                      value={authUsername}
                      onChange={(event) => setAuthUsername(event.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" disabled={loading}>
                    Envoyer la demande
                  </button>
                </>
              )}

              {authMode === 'reset' && (
                <>
                  <label>
                    Code
                    <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} required />
                  </label>
                  <label>
                    Nouveau mot de passe
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={4}
                      required
                    />
                  </label>
                  <button type="submit" disabled={loading}>
                    Reinitialiser
                  </button>
                </>
              )}
            </form>
          </section>
        </section>
      </main>
    );
  }

  function renderDashboard() {
    const recentMovements =
      dashboard?.recentMovements && dashboard.recentMovements.length > 0
        ? dashboard.recentMovements
        : movementHistory.slice(0, 5);

    return (
      <section className="admin-section">
        <div className="stat-grid">
          <article className="stat-card">
            <span>Produits</span>
            <strong>{dashboard?.totalProducts ?? allProducts.length}</strong>
            <small>References catalogue</small>
          </article>
          <article className="stat-card">
            <span>Rupture</span>
            <strong>{dashboard?.outOfStock ?? criticalProducts.filter((product) => product.quantity === 0).length}</strong>
            <small>Produits indisponibles</small>
          </article>
          <article className="stat-card">
            <span>Commandes</span>
            <strong>{dashboard?.totalOrders ?? 0}</strong>
            <small>Total commandes</small>
          </article>
          <article className="stat-card warning">
            <span>Alertes</span>
            <strong>{stockAlertProducts.length}</strong>
            <small>Stock faible</small>
          </article>
        </div>

        <div className="admin-dashboard-grid">
          <section className="admin-panel chart-panel">
            <div className="section-title">
              <h2>Stock par categorie</h2>
              <span>{allProducts.length} produits</span>
            </div>
            <div className="bar-chart">
              {categoryStats.map((item) => (
                <div className="chart-row" key={item.category}>
                  <span>{item.category}</span>
                  <div className="bar-track" aria-hidden="true">
                    <span style={{ width: `${item.width}%` }} />
                  </div>
                  <strong>{item.total}</strong>
                </div>
              ))}
              {categoryStats.length === 0 && <p className="empty-state">Aucune donnee stock.</p>}
            </div>
          </section>

          <section className="admin-panel">
            <div className="section-title">
              <h2>Mouvements recents</h2>
              <button className="ghost-button compact-button" type="button" onClick={() => setSection('stock')}>
                Voir stock
              </button>
            </div>
            <div className="movement-list">
              {recentMovements.map((movement) => (
                <article className="movement-row" key={movement.id}>
                  <span className={`movement-badge ${movement.type}`}>{movementLabel(movement.type)}</span>
                  <div>
                    <strong>{productById.get(movement.productId)?.name ?? `Produit ${movement.productId}`}</strong>
                    <span>{movement.description}</span>
                  </div>
                  <b>{movement.quantity}</b>
                </article>
              ))}
              {recentMovements.length === 0 && <p className="empty-state">Aucun mouvement pour le moment.</p>}
            </div>
          </section>

          <section className="admin-panel">
            <div className="section-title">
              <h2>Actions rapides</h2>
              {loading && <span>Chargement</span>}
            </div>
            <div className="quick-actions">
              <button type="button" onClick={() => setSection('products')}>
                Ajouter produit
              </button>
              <button type="button" onClick={() => setSection('stock')}>
                Mouvement stock
              </button>
              <button type="button" onClick={() => setSection('suppliers')}>
                Fournisseur
              </button>
              <button className="ghost-button" type="button" onClick={() => setSection('alerts')}>
                Alertes
              </button>
            </div>
          </section>

          <section className="admin-panel">
            <div className="section-title">
              <h2>Alertes stock</h2>
              <span>{stockAlertProducts.length}</span>
            </div>
            <div className="alert-list">
              {stockAlertProducts.slice(0, 5).map((product) => (
                <article className="alert-row" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                  </div>
                  <span className={product.quantity <= 2 ? 'critical-badge' : 'low-badge'}>
                    {product.quantity} restant
                  </span>
                </article>
              ))}
              {stockAlertProducts.length === 0 && <p className="empty-state">Aucune alerte active.</p>}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderProducts() {
    return (
      <section className="admin-section">
        <section className="toolbar admin-toolbar" aria-label="Recherche produits admin">
          <label>
            Recherche
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Nom ou description"
            />
          </label>
          <label>
            Categorie
            <select value={productCategory} onChange={(event) => setProductCategory(event.target.value)}>
              <option value="">Toutes</option>
              {productCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button" type="button" onClick={() => void refreshAdmin()}>
            Actualiser
          </button>
        </section>

        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="section-title">
              <h2>{editingProductId ? 'Modifier produit' : 'Ajouter produit'}</h2>
              {editingProductId && (
                <button className="ghost-button compact-button" type="button" onClick={resetProductForm}>
                  Annuler
                </button>
              )}
            </div>
            <form className="admin-form" onSubmit={handleProductSubmit}>
              <label>
                Nom
                <input
                  value={productForm.name}
                  onChange={(event) => updateProductForm('name', event.target.value)}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={productForm.description}
                  onChange={(event) => updateProductForm('description', event.target.value)}
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  Prix
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(event) => updateProductForm('price', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Quantite
                  <input
                    type="number"
                    min="0"
                    value={productForm.quantity}
                    onChange={(event) => updateProductForm('quantity', event.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Categorie
                  <input
                    value={productForm.category}
                    onChange={(event) => updateProductForm('category', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Fournisseur
                  <select
                    value={productForm.supplierId}
                    onChange={(event) => updateProductForm('supplierId', event.target.value)}
                  >
                    <option value="">Non assigne</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="submit" disabled={loading}>
                {editingProductId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </form>
          </section>

          <section className="admin-panel details-panel">
            <div className="section-title">
              <h2>Details produit</h2>
              {selectedProduct && <span className={stockClass(selectedProduct)}>{selectedProduct.quantity} stock</span>}
            </div>
            {selectedProduct ? (
              <div className="details-list">
                <strong>{selectedProduct.name}</strong>
                <span>{selectedProduct.description}</span>
                <span>{formatPrice(selectedProduct.price)}</span>
                <span>{selectedProduct.category}</span>
                <span>{supplierName(selectedProduct)}</span>
              </div>
            ) : (
              <p className="empty-state">Selectionnez un produit.</p>
            )}
          </section>
        </div>

        <section className="admin-panel table-panel">
          <div className="section-title">
            <h2>Table produits</h2>
            <span>{products.length}</span>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Categorie</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Fournisseur</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <span>{product.description}</span>
                    </td>
                    <td>{product.category}</td>
                    <td>{formatPrice(product.price)}</td>
                    <td>
                      <span className={stockClass(product)}>{product.quantity}</span>
                    </td>
                    <td>{supplierName(product)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          Details
                        </button>
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => startEditProduct(product)}
                        >
                          Modifier
                        </button>
                        <button
                          className="ghost-button compact-button danger"
                          type="button"
                          onClick={() => void handleDeleteProduct(product)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <p className="empty-state table-empty">Aucun produit trouve.</p>}
          </div>
        </section>
      </section>
    );
  }

  function renderStock() {
    return (
      <section className="admin-section">
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="section-title">
              <h2>Mouvement stock</h2>
              <span>{stockForm.type === 'entry' ? 'Entree' : 'Sortie'}</span>
            </div>
            <form className="admin-form" onSubmit={handleStockSubmit}>
              <label>
                Produit
                <select
                  value={stockForm.productId}
                  onChange={(event) => updateStockForm('productId', event.target.value)}
                  required
                >
                  {allProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Type
                  <select
                    value={stockForm.type}
                    onChange={(event) => updateStockForm('type', event.target.value)}
                  >
                    <option value="entry">Entree stock</option>
                    <option value="exit">Sortie stock</option>
                  </select>
                </label>
                <label>
                  Quantite
                  <input
                    type="number"
                    min="1"
                    value={stockForm.quantity}
                    onChange={(event) => updateStockForm('quantity', event.target.value)}
                    required
                  />
                </label>
              </div>
              <label>
                Description
                <input
                  value={stockForm.description}
                  onChange={(event) => updateStockForm('description', event.target.value)}
                  placeholder="Ajustement manuel"
                />
              </label>
              <button type="submit" disabled={loading || allProducts.length === 0}>
                Enregistrer mouvement
              </button>
            </form>
          </section>

          <section className="admin-panel">
            <div className="section-title">
              <h2>Resume stock</h2>
              <span>{allProducts.length}</span>
            </div>
            <div className="stock-summary">
              {allProducts.slice(0, 6).map((product) => (
                <article className="stock-summary-row" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                  </div>
                  <span className={stockClass(product)}>{product.quantity}</span>
                </article>
              ))}
              {allProducts.length === 0 && <p className="empty-state">Aucun produit en stock.</p>}
            </div>
          </section>
        </div>

        <section className="admin-panel table-panel">
          <div className="section-title">
            <h2>Historique stock</h2>
            <span>{movementHistory.length}</span>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Type</th>
                  <th>Quantite</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {movementHistory.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDate(movement.date)}</td>
                    <td>{productById.get(movement.productId)?.name ?? `Produit ${movement.productId}`}</td>
                    <td>
                      <span className={`movement-badge ${movement.type}`}>{movementLabel(movement.type)}</span>
                    </td>
                    <td>{movement.quantity}</td>
                    <td>{movement.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movementHistory.length === 0 && <p className="empty-state table-empty">Aucun historique stock.</p>}
          </div>
        </section>
      </section>
    );
  }

  function renderSuppliers() {
    return (
      <section className="admin-section">
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="section-title">
              <h2>{editingSupplierId ? 'Modifier fournisseur' : 'Ajouter fournisseur'}</h2>
              {editingSupplierId && (
                <button className="ghost-button compact-button" type="button" onClick={resetSupplierForm}>
                  Annuler
                </button>
              )}
            </div>
            <form className="admin-form" onSubmit={handleSupplierSubmit}>
              <label>
                Nom
                <input
                  value={supplierForm.name}
                  onChange={(event) => updateSupplierForm('name', event.target.value)}
                  required
                />
              </label>
              <label>
                Contact
                <input
                  value={supplierForm.contact}
                  onChange={(event) => updateSupplierForm('contact', event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={loading}>
                {editingSupplierId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </form>
          </section>

          <section className="admin-panel">
            <div className="section-title">
              <h2>Couverture</h2>
              <span>{suppliers.length}</span>
            </div>
            <div className="supplier-mini-list">
              {suppliers.map((supplier) => (
                <article className="supplier-mini-row" key={supplier.id}>
                  <strong>{supplier.name}</strong>
                  <span>
                    {allProducts.filter((product) => product.supplierId === supplier.id).length} produits
                  </span>
                </article>
              ))}
              {suppliers.length === 0 && <p className="empty-state">Aucun fournisseur.</p>}
            </div>
          </section>
        </div>

        <section className="admin-panel table-panel">
          <div className="section-title">
            <h2>Fournisseurs</h2>
            <span>{suppliers.length}</span>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Produits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <strong>{supplier.name}</strong>
                    </td>
                    <td>{supplier.contact}</td>
                    <td>{allProducts.filter((product) => product.supplierId === supplier.id).length}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => startEditSupplier(supplier)}
                        >
                          Modifier
                        </button>
                        <button
                          className="ghost-button compact-button danger"
                          type="button"
                          onClick={() => void handleDeleteSupplier(supplier)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {suppliers.length === 0 && <p className="empty-state table-empty">Aucun fournisseur trouve.</p>}
          </div>
        </section>
      </section>
    );
  }

  function renderAlerts() {
    return (
      <section className="admin-section">
        <div className="stat-grid">
          <article className="stat-card warning">
            <span>Critique</span>
            <strong>{criticalProducts.length}</strong>
            <small>Stock a 2 ou moins</small>
          </article>
          <article className="stat-card">
            <span>Faible</span>
            <strong>{lowStockProducts.length}</strong>
            <small>Entre 3 et {LOW_STOCK_LIMIT}</small>
          </article>
          <article className="stat-card">
            <span>OK</span>
            <strong>{allProducts.length - stockAlertProducts.length}</strong>
            <small>Stock suffisant</small>
          </article>
        </div>

        <section className="admin-panel">
          <div className="section-title">
            <h2>Notifications stock</h2>
            <button className="ghost-button compact-button" type="button" onClick={() => setSection('products')}>
              Gérer produits
            </button>
          </div>
          <div className="alert-grid">
            {[...criticalProducts, ...lowStockProducts].map((product) => (
              <article className="alert-card" key={product.id}>
                <div>
                  <span className={product.quantity <= 2 ? 'critical-badge' : 'low-badge'}>
                    {product.quantity <= 2 ? 'Critique' : 'Faible'}
                  </span>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                </div>
                <div className="product-meta">
                  <strong>{product.quantity} restant</strong>
                  <span>{product.category}</span>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setSection('stock');
                    setStockForm((current) => ({ ...current, productId: product.id, type: 'entry' }));
                  }}
                >
                  Reapprovisionner
                </button>
              </article>
            ))}
            {stockAlertProducts.length === 0 && <p className="empty-state">Aucune notification stock.</p>}
          </div>
        </section>
      </section>
    );
  }

  function renderSection() {
    if (section === 'products') return renderProducts();
    if (section === 'stock') return renderStock();
    if (section === 'suppliers') return renderSuppliers();
    if (section === 'alerts') return renderAlerts();
    return renderDashboard();
  }

  if (!isAdmin) {
    return renderAuthPanel();
  }

  return (
    <main className="app-shell admin-shell">
      <header className="topbar admin-topbar">
        <div>
          <span className="brand-kicker">Auto Piece</span>
          <h1>Administration</h1>
        </div>
        <div className="user-box">
          <span>{user.username}</span>
          <button className="ghost-button" type="button" onClick={onOpenStore}>
            Boutique
          </button>
          <button className="ghost-button" type="button" onClick={onLogout}>
            Deconnexion
          </button>
        </div>
      </header>

      {(notice || error) && (
        <section className={`message ${error ? 'error' : 'success'}`}>
          {error || notice}
        </section>
      )}

      <nav className="admin-nav" aria-label="Navigation admin">
        {[
          ['dashboard', 'Dashboard'],
          ['products', 'Produits'],
          ['stock', 'Stock'],
          ['suppliers', 'Fournisseurs'],
          ['alerts', 'Alertes'],
        ].map(([item, label]) => (
          <button
            className={section === item ? 'active' : ''}
            key={item}
            type="button"
            onClick={() => setSection(item as AdminSection)}
          >
            {label}
          </button>
        ))}
      </nav>

      {renderSection()}
    </main>
  );
}
