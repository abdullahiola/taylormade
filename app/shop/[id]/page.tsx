'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart, ArrowLeft, Check, Package, Star } from 'lucide-react';
import { products, formatPrice } from '@/lib/products';
import { useCart } from '@/context/CartContext';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="section-title mb-4">Product Not Found</h1>
        <Link href="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="page-enter">
      {/* Breadcrumb */}
      <div className="border-b border-tm-border px-6 md:px-12 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-body text-tm-gray-mid">
          <Link href="/" className="hover:text-tm-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-tm-red transition-colors">Shop</Link>
          <span>/</span>
          <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-tm-red transition-colors">{product.category}</Link>
          <span>/</span>
          <span className="text-tm-black font-semibold truncate max-w-48">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-tm-gray-mid hover:text-tm-black transition-colors text-sm font-body mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
          {/* Image */}
          <div className="relative aspect-square bg-tm-gray overflow-hidden sticky top-28 self-start">
            {product.badge && (
              <div className={`absolute top-4 left-4 z-10 badge text-white text-xs ${
                product.badge === 'Sale' ? 'bg-tm-red' :
                product.badge === 'New' ? 'bg-tm-black' :
                product.badge === 'Best Seller' ? 'bg-tm-red' : 'bg-tm-navy'
              }`}>
                {product.badge}
              </div>
            )}
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Info */}
          <div>
            <p className="text-xs text-tm-gray-mid uppercase tracking-[0.2em] font-body mb-2">{product.category}</p>
            <h1 className="font-sans font-black uppercase text-2xl md:text-3xl tracking-wide leading-tight mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${s <= 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              ))}
              <span className="text-xs text-tm-gray-mid ml-1 font-body">(4.0) · 128 reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-tm-border">
              <span className="font-sans font-black text-3xl">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-tm-gray-mid line-through font-body">{formatPrice(product.originalPrice)}</span>
                  <span className="bg-tm-red text-white text-xs font-bold px-2 py-1">
                    SAVE {Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="font-body text-tm-gray-dark leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Specs */}
            <div className="mb-8">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs mb-3">Specifications</h3>
              <ul className="space-y-2">
                {(product.specs ?? []).map((spec) => (
                  <li key={spec} className="flex items-start gap-2 text-sm font-body text-tm-gray-dark">
                    <span className="text-tm-red mt-0.5 flex-shrink-0">—</span>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              className={`w-full py-4 font-sans font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-200 ${
                added
                  ? 'bg-green-600 text-white'
                  : 'bg-tm-red text-white hover:bg-tm-red-dark'
              }`}
            >
              {added ? (
                <><Check className="w-5 h-5" /> Added to Cart!</>
              ) : (
                <><ShoppingCart className="w-5 h-5" /> Add to Cart</>
              )}
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-tm-border">
              {[
                { label: 'Free Shipping', sub: 'Over R3,000' },
                { label: 'Easy Returns', sub: '30 days' },
                { label: '100% Authentic', sub: 'Guaranteed' },
              ].map(({ label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1">
                  <Package className="w-4 h-4 text-tm-red" />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide">{label}</span>
                  <span className="text-xs text-tm-gray-mid font-body">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div>
            <h2 className="section-title mb-8">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => (
                <Link key={p.id} href={`/shop/${p.id}`} className="group card-hover border border-tm-border">
                  <div className="relative aspect-square bg-tm-gray overflow-hidden">
                    <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="25vw" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-sans font-bold text-xs uppercase tracking-wide group-hover:text-tm-red transition-colors">{p.name}</h3>
                    <p className="font-sans font-black text-sm mt-1">{formatPrice(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
