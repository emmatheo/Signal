/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The 0G SDKs (storage + compute) are Node-only and only ever imported
  // from server-side route handlers. Keep them out of the client bundle
  // and let Next treat them as external packages in the server bundle.
  experimental: {
    serverComponentsExternalPackages: [
      '@0gfoundation/0g-storage-ts-sdk',
      '@0gfoundation/0g-compute-ts-sdk',
    ],
  },
}

export default nextConfig
