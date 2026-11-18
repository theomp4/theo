/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",          // site statique : chaque chambre et chaque produit a sa propre page HTML (partage + référencement)
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
