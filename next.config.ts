import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.glsl": {
        loaders: [path.join(process.cwd(), "tools/glsl-raw-loader.cjs")],
        as: "*.js",
      },
      "*.frag": {
        loaders: [path.join(process.cwd(), "tools/glsl-raw-loader.cjs")],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
