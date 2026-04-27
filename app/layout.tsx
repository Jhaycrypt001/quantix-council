import './globals.css'; 
import { Web3Provider } from "@/context/Web3Provider";

export const metadata = {
  title: 'Quantix Council',
  description: 'Institutional autonomous trade governance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-[#e0e0e0] antialiased">
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}