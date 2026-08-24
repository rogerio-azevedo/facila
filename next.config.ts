import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // open-nfse puxa xmllint-wasm (validação XSD) e pdfkit/fontkit (DANFSe),
  // que usam __dirname — não podem ser bundled pelo Turbopack/Webpack.
  serverExternalPackages: ["open-nfse", "xmllint-wasm", "pdfkit", "fontkit"],
  experimental: {
    authInterrupts: true,
    taint: true,
  },
};

export default nextConfig;
