import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSession = create(persist((set, get) => ({
  token: null,
  user: null,
  cart: [],
  setAuth: ({ token, user }) => set({ token, user }),
  logout: () => set({ token: null, user: null, cart: [] }),
  addToCart: (product) => {
    const cart = get().cart;
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      return set({ cart: cart.map((item) => item.id === product.id
        ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
        : item) });
    }
    set({ cart: [...cart, { ...product, quantity: 1 }] });
  },
  setQuantity: (id, quantity) => set({ cart: get().cart
    .map((item) => item.id === id ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0) }),
  clearCart: () => set({ cart: [] }),
}), {
  name: 'pos-session',
  partialize: (state) => ({ token: state.token, user: state.user, cart: state.cart }),
}));