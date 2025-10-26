/** @type {import('next').NextConfig} */
const nextConfig = {
  // node-nlp'nin harici bağımlılıkları için Vercel/Next.js'in kullandığı en güncel key'i kullanalım
  experimental: {
    // Not: Eğer bu da hata verirse, sadece dış bağımlılıkları direkt 'next.config.js'de tanımlamamız gerekir.
    // Şimdilik root seviyesindeki 'serverExternalPackages' keyini deneyelim.
  },
  // Vercel'in bu keyi Next.js 14+ için root seviyesinde kabul etmesini bekleyelim
  serverExternalPackages: ["node-nlp", "react-textarea-autosize"],
};

export default nextConfig;
