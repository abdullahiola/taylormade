'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, ChevronLeft, CreditCard, Star, Zap, Shield, Gauge, Car, Tag, Coins } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// ─── Discount config ────────────────────────────────────────────────────────
const PREORDER_DISCOUNT = 0.35;   // 35% off — informed to user as "30–40% off"
const DISCOUNT_LABEL    = '35% OFF';
const OFFER_LABEL       = 'Pre-Order Launch Offer — Limited Time';

// ─── Data ────────────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: 'sport',
    name: 'Garia Sport',
    tagline: 'Performance meets elegance',
    basePrice: 14999,
    image: '/golf-car-hero.png',
    specs: { speed: '25 mph', range: '54 miles', seats: 2, charge: '8 hrs' },
    description: 'The Garia Sport combines sporty aesthetics with premium performance. Lightweight alloy frame, sport bucket seats, and a powerful 5 kW electric motor.',
  },
  {
    id: 'mansory',
    name: 'Garia Mansory',
    tagline: 'The ultimate luxury car',
    basePrice: 34999,
    image: '/golf-car-hero.png',
    specs: { speed: '25 mph', range: '54 miles', seats: 2, charge: '6 hrs' },
    description: 'A unique collaboration between Garia and Mansory. Carbon fibre bodywork, Nappa leather interior, crystal accent trim, bespoke paint.',
  },
  {
    id: 'roadster',
    name: 'Garia Roadster',
    tagline: 'Open-air freedom on the fairway',
    basePrice: 18999,
    image: '/golf-car-hero.png',
    specs: { speed: '25 mph', range: '54 miles', seats: 2, charge: '8 hrs' },
    description: 'Convertible golf car with retractable soft top, wrap-around windshield, and integrated sound system.',
  },
  {
    id: 'utility',
    name: 'Garia Utility',
    tagline: 'Work hard, look spectacular',
    basePrice: 12999,
    image: '/golf-car-hero.png',
    specs: { speed: '25 mph', range: '54 miles', seats: 4, charge: '8 hrs' },
    description: 'Four-seat luxury with rear-fold cargo space, tow hitch, all-terrain tyres, and weatherproof storage.',
  },
];

const BODY_COLORS = [
  { id: 'white',       name: 'Alpine White',         hex: '#F5F5F5', price: 0    },
  { id: 'black',       name: 'Midnight Black',        hex: '#1a1a1a', price: 0    },
  { id: 'navy',        name: 'Navy Blue',             hex: '#1B2A4A', price: 0    },
  { id: 'silver',      name: 'Glacier Silver',        hex: '#C0C4CC', price: 0    },
  { id: 'racing-red',  name: 'Racing Red',            hex: '#C0392B', price: 500  },
  { id: 'british-grn', name: 'British Racing Green',  hex: '#1B4332', price: 500  },
  { id: 'rose-gold',   name: 'Rose Gold',             hex: '#D4A0A0', price: 1200 },
  { id: 'matte-black', name: 'Matte Black',           hex: '#2d2d2d', price: 1500 },
];

const ROOF_COLORS = [
  { id: 'black',  name: 'Black',  hex: '#1a1a1a', price: 0   },
  { id: 'white',  name: 'White',  hex: '#F5F5F5', price: 0   },
  { id: 'carbon', name: 'Carbon', hex: '#3a3a3a', price: 800 },
  { id: 'beige',  name: 'Sand',   hex: '#D4C5A9', price: 0   },
];

const INTERIOR_COLORS = [
  { id: 'black', name: 'Onyx Black',  hex: '#1a1a1a', price: 0   },
  { id: 'beige', name: 'Cream Beige', hex: '#D4C5A9', price: 0   },
  { id: 'brown', name: 'Cognac',      hex: '#8B4513', price: 500 },
  { id: 'white', name: 'Ice White',   hex: '#F0EDE8', price: 800 },
  { id: 'navy',  name: 'Navy Blue',   hex: '#1B2A4A', price: 500 },
];

const WHEEL_OPTIONS = [
  { id: 'classic',  name: 'Classic Chrome',   price: 0,    desc: '10-spoke polished chrome alloy'  },
  { id: 'sport',    name: 'Sport Gunmetal',    price: 800,  desc: '5-spoke gunmetal performance'    },
  { id: 'diamond',  name: 'Diamond Cut',       price: 1200, desc: 'Diamond-cut two-tone finish'     },
  { id: 'carbon',   name: 'Carbon Composite',  price: 2500, desc: 'Ultra-lightweight carbon fibre'  },
];

const ACCESSORIES = [
  { id: 'gps',      name: 'GPS Display',         price: 599, icon: '🗺️', desc: 'Garmin Approach integrated GPS with course maps' },
  { id: 'cooler',   name: 'Beverage Cooler',      price: 499, icon: '🧊', desc: 'Thermoelectric cooler holds 6 cans/bottles'       },
  { id: 'sound',    name: 'Premium Sound System', price: 799, icon: '🔊', desc: 'Bluetooth speaker system with subwoofer'          },
  { id: 'cover',    name: 'All-Weather Cover',    price: 299, icon: '🌧️', desc: 'Fitted weatherproof full-car cover'               },
  { id: 'bag',      name: 'Bag Sensor & Lock',    price: 199, icon: '🔒', desc: 'Magnetic bag lock with theft alert sensor'        },
  { id: 'lights',   name: 'LED Light Package',    price: 349, icon: '💡', desc: 'Under-car LED ambient + upgraded headlights'      },
  { id: 'mirror',   name: 'Rear-View Camera',     price: 449, icon: '📷', desc: '180° reversing camera with 5" display'           },
  { id: 'umbrella', name: 'Umbrella Holder',      price: 99,  icon: '☂️', desc: 'Stainless steel rear-mounted umbrella bracket'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function calcBase(modelId: string, bodyColor: string, roof: string, interior: string, wheels: string, extras: string[]) {
  const model = MODELS.find(m => m.id === modelId)!;
  const body  = BODY_COLORS.find(c => c.id === bodyColor)!;
  const roofC = ROOF_COLORS.find(c => c.id === roof)!;
  const intC  = INTERIOR_COLORS.find(c => c.id === interior)!;
  const whl   = WHEEL_OPTIONS.find(w => w.id === wheels)!;
  const acc   = extras.reduce((s, id) => s + (ACCESSORIES.find(a => a.id === id)?.price ?? 0), 0);
  return model.basePrice + body.price + roofC.price + intC.price + whl.price + acc;
}

// ─── Components ───────────────────────────────────────────────────────────────
const STEPS = ['Model', 'Exterior', 'Interior', 'Wheels & Extras', 'Review'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex flex-col items-center gap-1 transition-all ${i <= current ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black font-sans ${
              i < current  ? 'bg-green-500 text-white' :
              i === current ? 'bg-tm-red text-white ring-4 ring-red-100' :
              'bg-tm-border text-tm-gray-mid'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs font-sans font-bold uppercase tracking-wider whitespace-nowrap hidden sm:block">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 h-px mx-1 transition-all ${i < current ? 'bg-green-500' : 'bg-tm-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Swatch({ hex, selected, onClick, title }: { hex: string; selected: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${selected ? 'border-tm-red ring-2 ring-red-200 scale-110' : 'border-white shadow'}`}
      style={{ backgroundColor: hex }}
    />
  );
}

// ─── Price Display ────────────────────────────────────────────────────────────
function PriceTag({ base, compact = false }: { base: number; compact?: boolean }) {
  const discounted = Math.round(base * (1 - PREORDER_DISCOUNT));
  return compact ? (
    <div className="flex items-center gap-2">
      <span className="font-black font-sans text-lg text-tm-red">{fmt(discounted)}</span>
      <span className="text-sm text-tm-gray-mid line-through font-body">{fmt(base)}</span>
      <span className="bg-tm-red text-white text-xs font-black px-1.5 py-0.5">{DISCOUNT_LABEL}</span>
    </div>
  ) : (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-black font-sans text-3xl text-tm-red">{fmt(discounted)}</span>
        <span className="text-lg text-tm-gray-mid line-through font-body">{fmt(base)}</span>
      </div>
      <p className="text-xs text-green-600 font-bold font-sans mt-0.5">You save {fmt(base - discounted)} ({DISCOUNT_LABEL})</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GolfCarsPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [step, setStep] = useState(0);

  const [modelId,   setModelId]   = useState('sport');
  const [bodyColor, setBodyColor] = useState('white');
  const [roofColor, setRoofColor] = useState('black');
  const [interior,  setInterior]  = useState('beige');
  const [wheels,    setWheels]    = useState('classic');
  const [extras,    setExtras]    = useState<string[]>([]);

  const model      = MODELS.find(m => m.id === modelId)!;
  const baseTotal  = calcBase(modelId, bodyColor, roofColor, interior, wheels, extras);
  const saleTotal  = Math.round(baseTotal * (1 - PREORDER_DISCOUNT));

  const toggleExtra = (id: string) =>
    setExtras(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const handleGoToCheckout = () => {
    addItem({
      id:       `golf-car-${modelId}-${Date.now()}`,
      name:     `${model.name} — Custom Golf Car`,
      price:    saleTotal,
      image:    '/golf-car-hero.png',
      category: 'Golf Cars' as never,
    });
    router.push('/checkout');
  };

  // ── Discount banner (persistent) ──────────────────────────────────────────
  const DiscountBanner = () => (
    <div className="flex items-center gap-3 bg-gradient-to-r from-tm-red to-red-700 text-white px-5 py-3 mb-6">
      <Tag className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-sans font-black text-sm uppercase tracking-wider">{OFFER_LABEL}</p>
        <p className="text-xs font-body text-white/80">All golf car pre-orders receive a <strong>30–40% discount</strong> off the list price. Your configured price already reflects this saving.</p>
      </div>
      <span className="bg-white text-tm-red font-black font-sans text-lg px-3 py-1 flex-shrink-0">{DISCOUNT_LABEL}</span>
    </div>
  );

  return (
    <div className="page-enter">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-tm-navy py-16 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="md:w-1/2">
            {/* Offer flag */}
            <div className="inline-flex items-center gap-2 bg-tm-red/20 border border-tm-red px-3 py-1.5 mb-4">
              <Tag className="w-3 h-3 text-tm-red" />
              <span className="text-tm-red font-sans font-black text-xs uppercase tracking-widest">Pre-Order: 30–40% Off List Price</span>
            </div>
            <h1 className="text-white font-black font-sans uppercase text-4xl md:text-5xl leading-none mb-4">
              Build Your<br /><span className="text-tm-red">Dream</span> Ride.
            </h1>
            <p className="text-gray-300 font-body mb-6 max-w-md leading-relaxed">
              Configure your perfect Garia luxury golf car. Pre-orders placed today receive an exclusive <strong className="text-white">30–40% discount</strong> off the full list price — no deposit required now.
            </p>
            <div className="flex flex-wrap gap-6">
              {[
                { icon: Tag,    label: '30–40% Pre-Order Discount' },
                { icon: Zap,    label: '100% Electric'             },
                { icon: Shield, label: '2-Year Warranty'           },
                { icon: Gauge,  label: 'Up to 25 mph'              },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-white/80">
                  <Icon className="w-4 h-4 text-tm-red" />
                  <span className="text-xs font-sans font-bold uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <div className="relative aspect-[4/3] w-full max-w-lg mx-auto">
              <Image src="/golf-car-hero.png" alt="Garia Luxury Golf Car" fill className="object-contain drop-shadow-2xl" sizes="600px" />
              {/* Discount badge on image */}
              <div className="absolute top-4 right-4 bg-tm-red text-white font-black font-sans text-2xl px-4 py-2 shadow-xl">
                {DISCOUNT_LABEL}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Configurator ──────────────────────────────────────────────────── */}
      <section className="py-12 px-4 md:px-12 max-w-6xl mx-auto">
        <h2 className="text-center section-title mb-2">Configure Your Garia</h2>
        <p className="text-center text-sm text-tm-gray-mid font-body mb-8">Customise every detail. Your <strong>30–40% pre-order discount</strong> is applied automatically at checkout.</p>

        <StepBar current={step} />
        <DiscountBanner />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">

            {/* ── STEP 0: Model ─────────────────────────────────────── */}
            {step === 0 && (
              <div>
                <h3 className="font-sans font-black uppercase tracking-widest text-sm mb-5 flex items-center gap-2"><Car className="w-4 h-4 text-tm-red" /> Choose Your Model</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MODELS.map(m => {
                    const disc = Math.round(m.basePrice * (1 - PREORDER_DISCOUNT));
                    return (
                      <button key={m.id} onClick={() => setModelId(m.id)}
                        className={`text-left border-2 p-4 transition-all hover:shadow-lg ${modelId === m.id ? 'border-tm-red bg-red-50' : 'border-tm-border hover:border-tm-gray-mid'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-sans font-black uppercase tracking-wide text-sm">{m.name}</p>
                            <p className="text-xs text-tm-gray-mid font-body">{m.tagline}</p>
                          </div>
                          {modelId === m.id && <Check className="w-5 h-5 text-tm-red flex-shrink-0" />}
                        </div>
                        <div className="relative aspect-[4/3] bg-tm-gray mb-3 overflow-hidden">
                          <Image src={m.image} alt={m.name} fill className="object-cover" sizes="300px" />
                          <div className="absolute top-2 right-2 bg-tm-red text-white text-xs font-black px-2 py-0.5">{DISCOUNT_LABEL}</div>
                        </div>
                        <div className="grid grid-cols-4 gap-1 mb-3">
                          {[{ label: 'Speed', val: m.specs.speed }, { label: 'Range', val: m.specs.range },
                            { label: 'Seats', val: String(m.specs.seats) }, { label: 'Charge', val: m.specs.charge },
                          ].map(s => (
                            <div key={s.label} className="text-center bg-tm-gray p-1">
                              <p className="text-xs font-black font-sans">{s.val}</p>
                              <p className="text-[10px] text-tm-gray-mid font-body uppercase">{s.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black font-sans text-tm-red">{fmt(disc)}</span>
                          <span className="text-sm text-tm-gray-mid line-through font-body">{fmt(m.basePrice)}</span>
                        </div>
                        <p className="text-xs text-tm-gray-mid font-body mt-1 line-clamp-2">{m.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 1: Exterior ─────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-8">
                {[
                  { title: 'Body Colour',  opts: BODY_COLORS,  val: bodyColor,  set: setBodyColor },
                  { title: 'Roof Colour',  opts: ROOF_COLORS,  val: roofColor,  set: setRoofColor },
                ].map(({ title, opts, val, set }) => (
                  <div key={title}>
                    <h3 className="font-sans font-black uppercase tracking-widest text-sm mb-4">{title}</h3>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {opts.map((c: { id: string; hex: string; name: string }) => <Swatch key={c.id} hex={c.hex} selected={val === c.id} onClick={() => set(c.id)} title={c.name} />)}
                    </div>
                    <div className="flex items-center justify-between border border-tm-border p-3">
                      <div>
                        <p className="font-sans font-bold text-sm">{opts.find(c => c.id === val)?.name}</p>
                        <p className="text-xs text-tm-gray-mid font-body">{title}</p>
                      </div>
                      <p className="font-sans font-black text-sm">
                        {(opts.find(c => c.id === val) as { price: number })?.price === 0 ? 'Included' : `+${fmt((opts.find(c => c.id === val) as { price: number })?.price ?? 0)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 2: Interior ─────────────────────────────────── */}
            {step === 2 && (
              <div>
                <h3 className="font-sans font-black uppercase tracking-widest text-sm mb-4">Interior / Leather Colour</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {INTERIOR_COLORS.map(c => <Swatch key={c.id} hex={c.hex} selected={interior === c.id} onClick={() => setInterior(c.id)} title={c.name} />)}
                </div>
                <div className="space-y-2">
                  {INTERIOR_COLORS.map(c => (
                    <button key={c.id} onClick={() => setInterior(c.id)}
                      className={`w-full flex items-center justify-between border p-3 transition-all text-left ${interior === c.id ? 'border-tm-red bg-red-50' : 'border-tm-border hover:border-tm-gray-mid'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full border border-tm-border flex-shrink-0" style={{ backgroundColor: c.hex }} />
                        <p className="font-sans font-bold text-sm">{c.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-body text-tm-gray-mid">{c.price === 0 ? 'Included' : `+${fmt(c.price)}`}</p>
                        {interior === c.id && <Check className="w-4 h-4 text-tm-red" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 3: Wheels & Accessories ─────────────────────── */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h3 className="font-sans font-black uppercase tracking-widest text-sm mb-4">Wheels</h3>
                  <div className="space-y-2">
                    {WHEEL_OPTIONS.map(w => (
                      <button key={w.id} onClick={() => setWheels(w.id)}
                        className={`w-full flex items-center justify-between border p-3 transition-all text-left ${wheels === w.id ? 'border-tm-red bg-red-50' : 'border-tm-border hover:border-tm-gray-mid'}`}
                      >
                        <div>
                          <p className="font-sans font-bold text-sm">{w.name}</p>
                          <p className="text-xs text-tm-gray-mid font-body">{w.desc}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="text-sm font-body text-tm-gray-mid">{w.price === 0 ? 'Included' : `+${fmt(w.price)}`}</p>
                          {wheels === w.id && <Check className="w-4 h-4 text-tm-red" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-black uppercase tracking-widest text-sm mb-4">Accessories <span className="text-tm-gray-mid font-body normal-case tracking-normal text-xs ml-2">Add any extras</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ACCESSORIES.map(a => {
                      const sel = extras.includes(a.id);
                      return (
                        <button key={a.id} onClick={() => toggleExtra(a.id)}
                          className={`flex items-start gap-3 border p-3 text-left transition-all ${sel ? 'border-tm-red bg-red-50' : 'border-tm-border hover:border-tm-gray-mid'}`}
                        >
                          <span className="text-2xl flex-shrink-0">{a.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-sans font-bold text-xs uppercase tracking-wide">{a.name}</p>
                            <p className="text-[10px] text-tm-gray-mid font-body leading-tight">{a.desc}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <p className="text-xs font-black font-sans text-tm-red">+{fmt(a.price)}</p>
                            {sel && <Check className="w-4 h-4 text-tm-red" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review & Pay ──────────────────────────────── */}
            {step === 4 && (
              <div>
                <h3 className="font-sans font-black uppercase tracking-widest text-sm mb-5">Review Your Configuration</h3>

                {/* Discount highlight box */}
                <div className="bg-green-50 border-2 border-green-500 p-5 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-5 h-5 text-green-600" />
                    <p className="font-sans font-black uppercase tracking-wider text-green-700">{OFFER_LABEL}</p>
                  </div>
                  <PriceTag base={baseTotal} />
                </div>

                <div className="space-y-2 mb-6 border border-tm-border divide-y divide-tm-border">
                  {[
                    { label: 'Model',    val: model.name },
                    { label: 'Body',     val: BODY_COLORS.find(c => c.id === bodyColor)?.name ?? '' },
                    { label: 'Roof',     val: ROOF_COLORS.find(c => c.id === roofColor)?.name ?? '' },
                    { label: 'Interior', val: INTERIOR_COLORS.find(c => c.id === interior)?.name ?? '' },
                    { label: 'Wheels',   val: WHEEL_OPTIONS.find(w => w.id === wheels)?.name ?? '' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between px-4 py-2 text-sm">
                      <span className="text-tm-gray-mid font-body">{r.label}</span>
                      <span className="font-bold font-sans">{r.val}</span>
                    </div>
                  ))}
                  {extras.length > 0 && extras.map(id => {
                    const acc = ACCESSORIES.find(a => a.id === id)!;
                    return (
                      <div key={id} className="flex justify-between px-4 py-2 text-sm">
                        <span className="text-tm-gray-mid font-body">{acc.icon} {acc.name}</span>
                        <span className="font-bold font-sans">+{fmt(acc.price)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pay buttons */}
                <p className="text-xs text-tm-gray-mid font-body mb-4">Select your payment method on the next page — pay with card or crypto.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={handleGoToCheckout}
                    className="flex items-center justify-center gap-2 bg-tm-red text-white py-4 font-sans font-black uppercase tracking-widest text-sm hover:bg-tm-red-dark transition-all"
                  >
                    <CreditCard className="w-5 h-5" /> Pay with Card
                  </button>
                  <button onClick={handleGoToCheckout}
                    className="flex items-center justify-center gap-2 bg-tm-black text-white py-4 font-sans font-black uppercase tracking-widest text-sm hover:bg-gray-800 transition-all"
                  >
                    <Coins className="w-5 h-5" /> Pay with Crypto
                  </button>
                </div>
                <p className="text-center text-xs text-tm-gray-mid font-body mt-3">🔒 Secure checkout. No commitment until payment is completed.</p>
              </div>
            )}

            {/* Nav buttons */}
            {step < 4 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-tm-border">
                <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                  className="flex items-center gap-2 text-sm font-body text-tm-gray-mid hover:text-tm-black transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(s => s + 1)} className="btn-primary flex items-center gap-2">
                  {step === 3 ? 'Review & Pay' : 'Continue'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {step === 4 && (
              <button onClick={() => setStep(3)}
                className="flex items-center gap-1 text-sm font-body text-tm-gray-mid hover:text-tm-black transition-colors mt-4"
              >
                <ChevronLeft className="w-4 h-4" /> Back to options
              </button>
            )}
          </div>

          {/* ── Sidebar summary ─────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="border border-tm-border sticky top-28">
              <div className="relative aspect-[4/3] bg-tm-gray overflow-hidden">
                <Image src={model.image} alt={model.name} fill className="object-cover" sizes="400px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 right-3 bg-tm-red text-white font-black font-sans text-sm px-2 py-1">{DISCOUNT_LABEL}</div>
                <div className="absolute bottom-3 left-4">
                  <p className="text-white font-black font-sans uppercase text-sm">{model.name}</p>
                  <p className="text-white/70 text-xs font-body">{model.tagline}</p>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-sans font-black uppercase tracking-widest text-xs mb-3">Your Configuration</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'Model',    val: model.name                                               },
                    { label: 'Body',     val: BODY_COLORS.find(c => c.id === bodyColor)?.name ?? ''   },
                    { label: 'Roof',     val: ROOF_COLORS.find(c => c.id === roofColor)?.name ?? ''   },
                    { label: 'Interior', val: INTERIOR_COLORS.find(c => c.id === interior)?.name ?? '' },
                    { label: 'Wheels',   val: WHEEL_OPTIONS.find(w => w.id === wheels)?.name ?? ''    },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-xs font-body">
                      <span className="text-tm-gray-mid">{r.label}</span>
                      <span className="font-bold text-right truncate max-w-28">{r.val}</span>
                    </div>
                  ))}
                </div>
                {extras.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-tm-border">
                    <p className="text-xs text-tm-gray-mid font-body mb-1">Accessories ({extras.length})</p>
                    {extras.map(id => <p key={id} className="text-xs font-body text-tm-gray-dark">{ACCESSORIES.find(a => a.id === id)?.icon} {ACCESSORIES.find(a => a.id === id)?.name}</p>)}
                  </div>
                )}
                {/* Price block */}
                <div className="mt-4 pt-4 border-t-2 border-tm-black">
                  <div className="flex items-center gap-1 mb-1">
                    <Tag className="w-3 h-3 text-tm-red" />
                    <span className="text-xs font-bold text-tm-red uppercase tracking-wider">Pre-Order {DISCOUNT_LABEL}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-black font-sans text-2xl text-tm-red">{fmt(saleTotal)}</span>
                    <span className="text-sm text-tm-gray-mid line-through">{fmt(baseTotal)}</span>
                  </div>
                  <p className="text-xs text-green-600 font-body font-bold mt-0.5">Save {fmt(baseTotal - saleTotal)}</p>
                </div>
              </div>
              <div className="bg-tm-navy p-3 flex items-center gap-2">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                <span className="text-white text-xs font-body ml-1">Rated 4.9 · 200+ Garia owners</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
