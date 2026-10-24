import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// 🚨 Nilagyan natin ng "as any" para ma-bypass ang type error ng next-pwa
export default withPWA(nextConfig as any);