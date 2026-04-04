'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-tm-navy text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <span className="font-sans font-black text-2xl uppercase tracking-tight">
                Charley<span className="text-tm-red"> Stores</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 font-body leading-relaxed">
              Premium golf equipment trusted by tour professionals worldwide.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-sans font-black uppercase tracking-widest text-xs mb-5">Shop</h3>
            <ul className="space-y-3">
              {['Drivers', 'Irons', 'Putters', 'Wedges', 'Golf Balls', 'Bags', 'Accessories'].map((item) => (
                <li key={item}>
                  <Link
                    href={`/shop?category=${encodeURIComponent(item)}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors font-body"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-sans font-black uppercase tracking-widest text-xs mb-5">Account</h3>
            <ul className="space-y-3">
              {[
                { label: 'Sign In', href: '/login' },
                { label: 'Create Account', href: '/signup' },
                { label: 'My Orders', href: '/orders' },
                { label: 'Cart', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors font-body">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-sans font-black uppercase tracking-widest text-xs mb-5">Help</h3>
            <ul className="space-y-3">
              {['Shipping Policy', 'Returns & Exchanges', 'Size Guide', 'FAQ', 'Contact Support'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors font-body">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 border border-white/10 bg-white/5">
              <p className="text-xs text-gray-400 font-body">Contact Us</p>
              <a href="mailto:admin@charleystores.shop" className="text-sm font-bold font-sans hover:text-tm-red transition-colors">admin@charleystores.shop</a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-6 md:px-12 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 font-body">
            © {new Date().getFullYear()} Charley Stores. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
              <a key={item} href="#" className="text-xs text-gray-500 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
