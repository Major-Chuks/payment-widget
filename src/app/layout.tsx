import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/WagmiProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-pjs",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Payment Widget",
  description: "Payment Widget",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable}  `}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
