'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star, ShieldCheck, Truck, RefreshCw, PenLine, Car } from 'lucide-react';
import { products, formatPrice } from '@/lib/products';
import { useCart } from '@/context/CartContext';

const featuredProducts = products.filter((p) => p.badge === 'Best Seller').slice(0, 4);
const newArrivals = products.filter((p) => p.isNew).slice(0, 4);

const heroCategories = [
  { label: 'Club Sets', image: '/clubhull.webp', cat: 'Club Sets' },
  { label: 'Clubs', image: '/hulll.webp', cat: 'Drivers' },
  { label: 'Golf Cars', image: '/hullcar.webp', cat: 'Golf Cars' },
];

function ProductCard({ product }: { product: typeof products[0] }) {
  const { addItem } = useCart();
  return (
    <div className="group card-hover bg-white border border-tm-border">
      <div className="relative overflow-hidden bg-tm-gray aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
        {product.badge && (
          <div className={`absolute top-3 left-3 badge text-white ${
            product.badge === 'Sale' ? 'bg-tm-red' :
            product.badge === 'New' ? 'bg-tm-black' :
            product.badge === 'Best Seller' ? 'bg-tm-red' : 'bg-tm-navy'
          }`}>
            {product.badge}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category })}
            className="btn-primary w-full text-center"
          >
            Add to Cart
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-tm-gray-mid font-body uppercase tracking-wider mb-1">{product.category}</p>
        <Link href={`/shop/${product.id}`}>
          <h3 className="font-sans font-bold text-sm uppercase tracking-wide leading-snug hover:text-tm-red transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-sans font-black text-base text-tm-red">{formatPrice(product.price)}</span>

        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center overflow-hidden bg-tm-navy">
        <div className="absolute inset-0">
          <Image
            src="/clean.webp"
            alt="Charley Stores Hero"
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
        </div>
        <div className="relative z-10 px-6 md:px-24 max-w-4xl">
          <p className="text-tm-red font-sans font-bold uppercase tracking-[0.3em] text-sm mb-4">
            New Season Collection
          </p>
          <h1 className="text-white font-sans font-black uppercase text-5xl md:text-7xl leading-none mb-6">
            Shop With<br />
            <span className="stroke-text">Charley</span><br />
            Hull.
          </h1>
          <p className="text-gray-300 font-body text-lg max-w-lg mb-8 leading-relaxed">
            Tour-proven technology, now available to every golfer. Shop the latest Charley Stores equipment and elevate your game.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/shop" className="btn-primary">
              Shop All Products
            </Link>
            <Link href="/shop?category=Drivers" className="btn-ghost">
              Explore Drivers
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50">
          <div className="w-px h-12 bg-white/30 animate-pulse" />
          <span className="text-xs font-sans uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h2 className="section-title">Shop by Category</h2>
          <Link href="/shop" className="navlink flex items-center gap-1 text-sm font-sans font-bold uppercase tracking-widest text-tm-navy hover:text-tm-red transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {heroCategories.map((cat) => (
            <Link
              key={cat.label}
              href={`/shop?category=${encodeURIComponent(cat.cat)}`}
              className="group relative aspect-[4/3] overflow-hidden"
            >
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-white font-sans font-black uppercase tracking-widest text-xl mb-2">{cat.label}</h3>
                <span className="text-white/80 text-xs font-sans font-bold uppercase tracking-widest flex items-center gap-1 group-hover:gap-3 transition-all">
                  Shop Now <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-16 px-6 md:px-12 bg-tm-gray">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-tm-red text-xs font-sans font-bold uppercase tracking-[0.3em] mb-1">Top Picks</p>
              <h2 className="section-title">Best Sellers</h2>
            </div>
            <Link href="/shop?filter=Best+Seller" className="hidden md:flex items-center gap-1 text-sm font-sans font-bold uppercase tracking-widest text-tm-navy hover:text-tm-red transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-tm-red text-xs font-sans font-bold uppercase tracking-[0.3em] mb-1">Just Dropped</p>
            <h2 className="section-title">New Arrivals</h2>
          </div>
          <Link href="/shop?filter=New" className="hidden md:flex items-center gap-1 text-sm font-sans font-bold uppercase tracking-widest text-tm-navy hover:text-tm-red transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Trust Strip */}
      <section className="relative bg-gradient-to-b from-gray-950 to-gray-900 py-16 px-6 md:px-12 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/3 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/3 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <p className="text-center text-[10px] font-sans font-bold uppercase tracking-[0.35em] text-gray-500 mb-10">Why Shop With Us</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: PenLine, title: 'Personally Signed', desc: 'Every item signed by Charley Hull herself', gradient: 'from-purple-500/20 to-fuchsia-500/20', iconColor: 'text-purple-400', borderColor: 'border-purple-500/10', hoverGlow: 'hover:shadow-purple-500/5' },
              { icon: Car, title: '1-on-1 With Charley', desc: 'Golf car buyers get a private session', gradient: 'from-rose-500/20 to-pink-500/20', iconColor: 'text-rose-400', borderColor: 'border-rose-500/10', hoverGlow: 'hover:shadow-rose-500/5' },
              { icon: Truck, title: 'Free Shipping', desc: 'Free shipping on first time purchase', gradient: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400', borderColor: 'border-red-500/10', hoverGlow: 'hover:shadow-red-500/5' },
              { icon: RefreshCw, title: 'Easy Returns', desc: '30-day return policy', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', borderColor: 'border-blue-500/10', hoverGlow: 'hover:shadow-blue-500/5' },
              { icon: ShieldCheck, title: 'Authentic Gear', desc: '100% genuine products', gradient: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/10', hoverGlow: 'hover:shadow-emerald-500/5' },
              { icon: Star, title: 'Tour Proven', desc: 'Trusted by top pros', gradient: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-400', borderColor: 'border-amber-500/10', hoverGlow: 'hover:shadow-amber-500/5' },
            ].map(({ icon: Icon, title, desc, gradient, iconColor, borderColor, hoverGlow }) => (
              <div
                key={title}
                className={`group relative bg-white/[0.03] backdrop-blur-sm border ${borderColor} rounded-2xl p-6 flex flex-col items-center text-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-xl ${hoverGlow}`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                {/* Text */}
                <div>
                  <h3 className="text-white font-sans font-black uppercase tracking-wider text-xs mb-1">{title}</h3>
                  <p className="text-gray-500 text-[11px] font-body leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-24 px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/usee.webp"
            alt="CTA background"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-tm-black/80" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-white font-sans font-black uppercase text-4xl md:text-5xl mb-4">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-gray-300 font-body mb-8">
            Browse our full catalog of premium Charley Stores equipment. From beginner to tour pro — we have exactly what you need.
          </p>
          <Link href="/shop" className="btn-primary">
            Shop the Full Collection
          </Link>
        </div>
      </section>
    </div>
  );
}
