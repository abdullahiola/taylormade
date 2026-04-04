// ─── Crypto Wallet Configuration ──────────────────────────────────────────────

export type CryptoSymbol = 'BTC' | 'ETH' | 'SOL' | 'USDT';

export interface CryptoWallet {
  address: string;
  name: string;
  symbol: CryptoSymbol;
  network: string;
  geckoId: string;  // CoinGecko ID for live price fetching
  color: string;
  logo: string;     // Path to official logo SVG in /public
}

export const CRYPTO_WALLETS: Record<CryptoSymbol, CryptoWallet> = {
  BTC: {
    address: '3DJTfL2UcY83sQ21h9CVnB36nWdt52mXPb',
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin Network',
    geckoId: 'bitcoin',
    color: '#F7931A',
    logo: '/btc-logo.svg',
  },
  ETH: {
    address: '0x754EF01Ed05Fc3ba3198092714B3A7cFB5379091',
    name: 'Ethereum',
    symbol: 'ETH',
    network: 'Ethereum (ERC-20)',
    geckoId: 'ethereum',
    color: '#627EEA',
    logo: '/eth-logo.svg',
  },
  SOL: {
    address: 'Csfm76Xxxj1qmbTw3DQLkY5PLcausuMcQvmpLgKyZHSF',
    name: 'Solana',
    symbol: 'SOL',
    network: 'Solana Network',
    geckoId: 'solana',
    color: '#9945FF',
    logo: '/solana-logo.svg',
  },
  USDT: {
    address: 'Csfm76Xxxj1qmbTw3DQLkY5PLcausuMcQvmpLgKyZHSF',
    name: 'Tether USD',
    symbol: 'USDT',
    network: 'Solana (SPL)',
    geckoId: 'tether',
    color: '#26A17B',
    logo: '/usdt-logo.svg',
  },
};
