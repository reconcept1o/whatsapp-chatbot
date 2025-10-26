/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'serverComponentsExternalPackages' yerine 'serverExternalPackages' kullanıldı
  experimental: {
    serverExternalPackages: ["node-nlp", "react-textarea-autosize"],
  },
};

export default nextConfig;
