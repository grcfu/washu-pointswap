import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "WashU Pointswap",
  description:
    "Buy and sell WashU MarketPoints. A real-time marketplace for Washington University students to trade leftover meal points.",
};

// Tints the browser chrome on mobile to the brand green. Kept in sync with
// --color-brand in globals.css by hand; there is no way to read a CSS token here.
export const viewport = {
  themeColor: "#215732",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}>
      <head>
        {/* No manual icon link: Next.js injects them from src/app/icon0.svg,
            icon1.png and apple-icon.png. */}

        {/*
          Applies the theme before first paint, so nobody sees a flash of the wrong
          palette. Must stay synchronous and inline in <head>; deferring it or moving
          it into a component would reintroduce the flash.

          Dark is the default for first-time visitors regardless of their OS setting --
          it is the intended look of the site. A saved choice from the toggle always
          wins, in either direction. The catch falls back to dark too, so a storage
          exception cannot silently flip the site to light.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('pointswap_theme');document.documentElement.dataset.theme=s==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}})()`,
          }}
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-CZKEEEM2ZN"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-CZKEEEM2ZN');
        `}} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}