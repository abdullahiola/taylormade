'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCart, User, Menu, X, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Home', sub: [] },
  {
    label: 'Clubs',
    sub: ['Drivers', 'Fairways', 'Hybrids', 'Irons', 'Putters'],
  },
  { label: 'Golf Cars', sub: [] },
];

export default function Navbar() {
  const { itemCount, openCart } = useCart();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleCategoryNav = (cat: string) => {
    router.push(`/shop?category=${encodeURIComponent(cat)}`);
    setMobileOpen(false);
    setActiveDropdown(null);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-tm-border">
      {/* Top strip */}
      <div className="bg-tm-navy text-white text-center text-xs font-sans uppercase tracking-widest py-2">
      Free Shipping on First Time Purchase
      </div>

      {/* Main nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0.5">
          <span className="font-sans font-black text-xl uppercase tracking-tight text-tm-navy">
            Charley<span className="text-tm-red"> Stores</span>
          </span>
        </Link>

        {/* Desktop menu */}
        <ul className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <li
              key={item.label}
              className="relative group"
              onMouseEnter={() => item.sub.length > 0 && setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              {item.sub.length > 0 ? (
                <>
                  <button
                    className="nav-link flex items-center gap-1 py-2"
                    onClick={() => { router.push('/shop'); setActiveDropdown(null); }}
                  >
                    {item.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {activeDropdown === item.label && (
                    <div className="absolute top-full left-0 bg-white border border-tm-border shadow-xl min-w-48 py-2 animate-fade-in">
                      {item.sub.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => handleCategoryNav(sub)}
                          className="block w-full text-left px-4 py-2 text-sm font-sans font-semibold uppercase tracking-wider text-tm-navy hover:bg-tm-gray hover:text-tm-red transition-colors"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => item.label === 'Home' ? router.push('/') : handleCategoryNav(item.label)}
                  className="nav-link py-2"
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}

          <li>
            <Link href="/shop" className="nav-link py-2">Shop All</Link>
          </li>
          <li>
            <Link href="/orders" className="nav-link py-2">My Orders</Link>
          </li>
        </ul>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 text-tm-navy hover:text-tm-red transition-colors"
              aria-label="User account"
            >
              <User className="w-5 h-5" />
              {user && (
                <span className="hidden sm:block text-xs font-bold font-sans uppercase tracking-wider">
                  {user.name.split(' ')[0]}
                </span>
              )}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-tm-border shadow-xl min-w-44 py-2 animate-fade-in">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-tm-border">
                      <p className="text-xs text-tm-gray-mid font-body">Signed in as</p>
                      <p className="text-sm font-bold font-sans truncate">{user.name}</p>
                    </div>
                    <Link
                      href="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-sans font-semibold uppercase tracking-wider text-tm-navy hover:bg-tm-gray hover:text-tm-red transition-colors"
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm font-sans font-semibold uppercase tracking-wider text-tm-red hover:bg-tm-gray transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-sans font-semibold uppercase tracking-wider text-tm-navy hover:bg-tm-gray hover:text-tm-red transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-sans font-semibold uppercase tracking-wider text-tm-navy hover:bg-tm-gray hover:text-tm-red transition-colors"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <button
            onClick={openCart}
            className="relative text-tm-navy hover:text-tm-red transition-colors"
            aria-label={`Cart (${itemCount})`}
          >
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-tm-red text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center font-sans">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-tm-navy hover:text-tm-red transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-tm-border shadow-lg animate-fade-in">
          {navItems.map((item) => (
            <div key={item.label}>
              <button
                onClick={() => handleCategoryNav(item.label)}
                className="block w-full text-left px-6 py-4 text-sm font-sans font-bold uppercase tracking-widest text-tm-navy hover:bg-tm-gray hover:text-tm-red border-b border-tm-border transition-colors"
              >
                {item.label}
              </button>
              {item.sub.map((sub) => (
                <button
                  key={sub}
                  onClick={() => handleCategoryNav(sub)}
                  className="block w-full text-left px-10 py-3 text-xs font-sans font-semibold uppercase tracking-widest text-tm-gray-mid hover:text-tm-red border-b border-tm-border transition-colors"
                >
                  {sub}
                </button>
              ))}
            </div>
          ))}
          <button
            onClick={() => { router.push('/shop'); setMobileOpen(false); }}
            className="block w-full text-left px-6 py-4 text-sm font-sans font-bold uppercase tracking-widest text-tm-navy hover:bg-tm-gray hover:text-tm-red border-b border-tm-border transition-colors"
          >
            Shop All
          </button>
          <button
            onClick={() => { router.push('/orders'); setMobileOpen(false); }}
            className="block w-full text-left px-6 py-4 text-sm font-sans font-bold uppercase tracking-widest text-tm-navy hover:bg-tm-gray hover:text-tm-red border-b border-tm-border transition-colors"
          >
            My Orders
          </button>
          <div className="px-6 py-4 flex gap-4">
            {user ? (
              <button onClick={() => { logout(); setMobileOpen(false); }} className="text-tm-red text-sm font-bold font-sans uppercase tracking-wider">
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="text-tm-navy text-sm font-bold font-sans uppercase tracking-wider hover:text-tm-red">Sign In</Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="text-tm-red text-sm font-bold font-sans uppercase tracking-wider hover:text-tm-red-dark">Create Account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
