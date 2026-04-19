import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		minimumCacheTTL: 2678400,
		formats: ["image/webp"],
		qualities: [75],
		deviceSizes: [640, 768, 1024, 1280, 1536],
		imageSizes: [48, 64, 96, 128, 192, 256, 384],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "perfoumer-cdn.vercel.app",
				pathname: "/perfumes/**",
			},
			{
				protocol: "https",
				hostname: "logo.clearbit.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "t2.gstatic.com",
				pathname: "/faviconV2",
			},
			{
				protocol: "https",
				hostname: "framerusercontent.com",
				pathname: "/images/**",
			},
			{
				protocol: "https",
				hostname: "fimgs.net",
				pathname: "/mdimg/perfume-thumbs/**",
			},
			{
				protocol: "https",
				hostname: "www.etirsah.com",
				pathname: "/storage/photos/**",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
				pathname: "/**",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/:path*",
				has: [
					{
						type: "host",
						value: "www.perfoumer.az",
					},
				],
				destination: "https://perfoumer.az/:path*",
				permanent: true,
			},
		];
	},
	async headers() {
		if (process.env.NODE_ENV === "production") {
			return [];
		}

		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store, max-age=0, must-revalidate",
					},
					{
						key: "Pragma",
						value: "no-cache",
					},
				],
			},
		];
	},
};

export default nextConfig;
