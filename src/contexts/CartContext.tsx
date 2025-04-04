
import { ReactNode, createContext, useContext, useState } from 'react';

interface Seat {
  row: number;
  col: number;
  seatNumber: string;
}

interface CartItem {
  showTimeId: number;
  showId: number;
  showTitle: string;
  showDate: string;
  startTime: string;
  seats: Seat[];
  pricePerSeat: number;
}

interface ProductItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  products: ProductItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (showTimeId: number) => void;
  clearCart: () => void;
  addProduct: (product: ProductItem) => void;
  updateProductQuantity: (productId: number, quantity: number) => void;
  removeProduct: (productId: number) => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const addToCart = (item: CartItem) => {
    // Replace if the same showTimeId exists, otherwise add new
    setItems(prevItems => {
      const exists = prevItems.findIndex(i => i.showTimeId === item.showTimeId);
      if (exists !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[exists] = item;
        return updatedItems;
      } else {
        return [...prevItems, item];
      }
    });
  };

  const removeFromCart = (showTimeId: number) => {
    setItems(prevItems => prevItems.filter(item => item.showTimeId !== showTimeId));
  };

  const clearCart = () => {
    setItems([]);
    setProducts([]);
  };

  const addProduct = (product: ProductItem) => {
    setProducts(prevProducts => {
      const exists = prevProducts.findIndex(p => p.productId === product.productId);
      if (exists !== -1) {
        const updatedProducts = [...prevProducts];
        updatedProducts[exists].quantity += product.quantity;
        return updatedProducts;
      } else {
        return [...prevProducts, product];
      }
    });
  };

  const updateProductQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }

    setProducts(prevProducts => {
      return prevProducts.map(p => 
        p.productId === productId ? { ...p, quantity } : p
      );
    });
  };

  const removeProduct = (productId: number) => {
    setProducts(prevProducts => 
      prevProducts.filter(product => product.productId !== productId)
    );
  };

  const getTotalPrice = () => {
    const ticketsTotal = items.reduce((sum, item) => 
      sum + (item.seats.length * item.pricePerSeat), 0
    );
    
    const productsTotal = products.reduce((sum, product) => 
      sum + (product.price * product.quantity), 0
    );
    
    return ticketsTotal + productsTotal;
  };

  const getItemCount = () => {
    const ticketCount = items.reduce((sum, item) => sum + item.seats.length, 0);
    const productCount = products.reduce((sum, product) => sum + product.quantity, 0);
    return ticketCount + productCount;
  };

  return (
    <CartContext.Provider value={{
      items,
      products,
      addToCart,
      removeFromCart,
      clearCart,
      addProduct,
      updateProductQuantity,
      removeProduct,
      getTotalPrice,
      getItemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}
