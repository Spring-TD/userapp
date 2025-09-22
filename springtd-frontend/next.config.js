const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*", // MUST be 3001
      },
    ]
  },
}

module.exports = nextConfig
