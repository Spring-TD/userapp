import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Resolve react-redux (and Redux) from this app's node_modules only (avoids parent-repo resolution)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-redux": path.resolve(__dirname, "node_modules/react-redux"),
      "@reduxjs/toolkit": path.resolve(__dirname, "node_modules/@reduxjs/toolkit"),
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  // Security headers including Content Security Policy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            // Required for YouTube embeds (Error 153 without a usable Referer).
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
              "style-src 'self' 'unsafe-inline'", // Required for inline styles
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "media-src 'self' https: blob:",
              "connect-src 'self' https://*.fly.dev https://*.vercel.app https://restcountries.com https://nominatim.openstreetmap.org wss:",
              // Virtual tour: OpenStreetMap embed + YouTube property video (+ Google Maps if used)
              "frame-src 'self' https://www.openstreetmap.org https://openstreetmap.org https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://www.google.com https://maps.google.com https://*.google.com",
              "child-src 'self' https://www.openstreetmap.org https://openstreetmap.org https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://www.google.com https://maps.google.com https://*.google.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default nextConfig
