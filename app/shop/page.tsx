'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { products, categories, formatPrice, Product } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import ItemRequestForm from '@/components/ItemRequestForm';

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Newest', value: 'newest' },
];

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  return (
    <Link href={`/shop/${product.id}`} className="group card-hover bg-white border border-tm-border flex flex-col">
      <div className="relative overflow-hidden bg-tm-gray aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Badge top-left */}
        {product.badge && (
          <div className={`absolute top-3 left-3 badge text-white text-xs ${
            product.badge === 'Sale' ? 'bg-tm-red' :
            product.badge === 'New' ? 'bg-tm-black' :
            product.badge === 'Best Seller' ? 'bg-tm-red' : 'bg-tm-navy'
          }`}>
            {product.badge}
          </div>
        )}

      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-tm-gray-mid uppercase tracking-wider mb-1 font-body">{product.category}</p>
        <h2 className="font-sans font-bold text-sm uppercase tracking-wide leading-snug group-hover:text-tm-red transition-colors flex-1">
          {product.name}
        </h2>
        <p className="text-xs text-tm-gray-mid font-body mt-2 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-tm-border">
          <div>
            <span className="font-sans font-black text-base text-tm-red">{formatPrice(product.price)}</span>

          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category }); }}
            className="bg-tm-black text-white text-xs font-sans font-bold uppercase tracking-widest px-4 py-2 hover:bg-tm-red transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </Link>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sortBy, setSortBy] = useState('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const categoryParam = searchParams.get('category') || 'all';
  const filterParam = searchParams.get('filter') || '';

  const filtered = products
    .filter((p) => {
      if (categoryParam !== 'all' && p.category !== categoryParam) return false;
      if (filterParam === 'Best+Seller' || filterParam === 'Best Seller') return p.badge === 'Best Seller';
      if (filterParam === 'New') return p.isNew;
      if (filterParam === 'Sale') return p.badge === 'Sale';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      return 0;
    });

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat !== 'all') params.set('category', cat);
    router.push(`/shop${params.toString() ? '?' + params.toString() : ''}`);
    setMobileFilterOpen(false);
  };

  return (
    <div className="page-enter max-w-7xl mx-auto px-4 md:px-12 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title mb-1">Shop</h1>
        <p className="text-sm text-tm-gray-mid font-body">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          {categoryParam !== 'all' ? ` in ${categoryParam}` : ''}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters - Desktop */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-28">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
              <Filter className="w-3 h-3" /> Categories
            </h3>
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setCategory(cat.id)}
                    className={`w-full text-left text-sm py-2 px-3 font-body transition-colors ${
                      (cat.id === 'all' && categoryParam === 'all') || cat.id === categoryParam
                        ? 'bg-tm-black text-white font-bold'
                        : 'hover:bg-tm-gray text-tm-navy'
                    }`}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 gap-4">
            {/* Mobile filter trigger */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden btn-secondary flex items-center gap-2 text-xs py-2 px-4"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filter
            </button>

            {/* Sort */}
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-tm-gray-mid font-body uppercase tracking-wider">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-tm-border text-sm font-body px-3 py-2 focus:outline-none focus:border-tm-black"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-sans font-bold uppercase tracking-wider text-tm-gray-mid text-lg mb-6">No products found</p>
              <button onClick={() => setCategory('all')} className="btn-primary mb-10">View All</button>
              <div className="max-w-lg mx-auto">
                <ItemRequestForm compact />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {/* Item request card */}
              <div className="mt-12">
                <ItemRequestForm />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter overlay */}
      {mobileFilterOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileFilterOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-72 bg-white z-50 p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-sans font-black uppercase tracking-widest text-sm">Categories</h3>
              <button onClick={() => setMobileFilterOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setCategory(cat.id)}
                    className={`w-full text-left text-sm py-3 px-3 font-body transition-colors border-b border-tm-border ${
                      (cat.id === 'all' && categoryParam === 'all') || cat.id === categoryParam
                        ? 'bg-tm-black text-white font-bold'
                        : 'hover:bg-tm-gray text-tm-navy'
                    }`}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-tm-red border-t-transparent rounded-full animate-spin" /></div>}>
      <ShopContent />
    </Suspense>
  );
}
