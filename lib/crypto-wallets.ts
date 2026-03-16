// ─── Crypto Wallet Configuration ──────────────────────────────────────────────
// Update the wallet addresses below with your actual receiving addresses.
// These are placeholder addresses — do NOT use them for real transactions.

export type CryptoSymbol = 'BTC' | 'ETH' | 'USDT';

export interface CryptoWallet {
  address: string;
  name: string;
  symbol: CryptoSymbol;
  network: string;
  geckoId: string;  // CoinGecko ID for live price fetching
  color: string;
  emoji: string;
}

export const CRYPTO_WALLETS: Record<CryptoSymbol, CryptoWallet> = {
  BTC: {
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', // ← Replace with your BTC address
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin Network',
    geckoId: 'bitcoin',
    color: '#F7931A',
    emoji: '₿',
  },
  ETH: {
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // ← Replace with your ETH address
    name: 'Ethereum',
    symbol: 'ETH',
    network: 'Ethereum (ERC-20)',
    geckoId: 'ethereum',
    color: '#627EEA',
    emoji: 'Ξ',
  },
  USDT: {
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', // ← Replace with your USDT (TRC-20) address
    name: 'Tether USD',
    symbol: 'USDT',
    network: 'TRON (TRC-20)',
    geckoId: 'tether',
    color: '#26A17B',
    emoji: '₮',
  },
};
