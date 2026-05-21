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
  category: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'delivered' | string;
  date: string;
};
