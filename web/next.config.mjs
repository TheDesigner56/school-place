/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";
const nextConfig = {
  reactStrictMode: true,
  ...(isPages
    ? {
        output: "export",
        basePath: "/school-place",
        assetPrefix: "/school-place/",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};
export default nextConfig;
