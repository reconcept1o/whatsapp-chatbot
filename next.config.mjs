/** @type {import('next').NextConfig} */
const nextConfig = {
  // node-nlp gibi node_modules'daki paketleri harici olarak işaretler
  // Vercel'in derleme sorunu yaşamaması için kritik
  experimental: {
    serverComponentsExternalPackages: ["node-nlp", "react-textarea-autosize"],
  },
};

export default nextConfig;
