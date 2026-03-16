'use client';

import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/products';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, itemCount } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    if (!user) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] flex flex-col cart-slide shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tm-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-tm-red" />
            <h2 className="font-sans font-black uppercase tracking-widest text-sm">
              Cart ({itemCount})
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="text-tm-gray-mid hover:text-tm-black transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <ShoppingBag className="w-16 h-16 text-tm-border mb-4" />
              <h3 className="font-sans font-black uppercase tracking-wider text-lg mb-2">Your cart is empty</h3>
              <p className="text-tm-gray-mid text-sm font-body mb-6">
                Add some premium golf gear to get started.
              </p>
              <button onClick={closeCart} className="btn-primary">
                Shop Now
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-tm-border">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4">
                  <div className="relative w-20 h-20 flex-shrink-0 bg-tm-gray overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-bold text-xs uppercase tracking-wider leading-tight mb-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-tm-gray-mid font-body mb-2">{item.category}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 border border-tm-border flex items-center justify-center hover:border-tm-black transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm w-6 text-center font-sans">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 border border-tm-border flex items-center justify-center hover:border-tm-black transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="font-sans font-black text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-tm-gray-mid hover:text-tm-red transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-tm-border px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold uppercase tracking-wider text-sm">Subtotal</span>
              <span className="font-sans font-black text-lg">{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-tm-gray-mid font-body">
            Shipping calculated at checkout. Free shipping on orders over $200.
            </p>
            <button
              onClick={handleCheckout}
              className="btn-primary w-full text-center block"
            >
              Proceed to Checkout
            </button>
            <button
              onClick={closeCart}
              className="btn-secondary w-full text-center block"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
