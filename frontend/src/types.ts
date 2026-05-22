export type User = {
  id: string;
  username: string;
  role: string;
  accessToken: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  supplierId?: string;
  supplierName?: string;
  category: string;
  primaryImage?: string;
  ratingAverage?: number;
  reviewCount?: number;
};

export type ProductMedia = {
  id: string;
  productId: string;
  kind: 'image' | 'video';
  url: string;
  altText: string;
  sortOrder: number;
};

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  productName?: string;
};

export type ProductDetail = Product & {
  media: ProductMedia[];
  reviews: ProductReview[];
  similarProducts: Product[];
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type OrderItem = {
  productId: string;
  quantity: number;
  price?: number;
};

export type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'delivered' | string;
  date: string;
  total?: number;
};

export type StockMovement = {
  id: string;
  productId: string;
  type: 'entry' | 'exit' | string;
  quantity: number;
  date: string;
  description: string;
};

export type DashboardStats = {
  totalProducts: number;
  outOfStock: number;
  totalOrders: number;
  totalRevenue?: number;
  recentMovements: StockMovement[];
  lowStockProducts?: Pick<Product, 'id' | 'name' | 'quantity'>[];
};
