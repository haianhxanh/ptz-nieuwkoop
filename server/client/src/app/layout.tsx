import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ProductsProvider } from "@/contexts/products-context";

export const metadata: Metadata = {
  title: "Nabídky - Potzillas",
  description: "Systém pro správu nabídek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ProductsProvider>
          {children}
        </ProductsProvider>
        <Toaster />
      </body>
    </html>
  );
}
