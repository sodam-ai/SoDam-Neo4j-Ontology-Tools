import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output for potential containerization later
  // output: 'standalone',

  // Transpile cytoscape packages (ESM compatibility)
  transpilePackages: ['cytoscape', 'cytoscape-cose-bilkent'],
}

export default nextConfig
