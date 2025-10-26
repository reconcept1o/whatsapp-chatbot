// app/layout.js
import "./globals.css";

export const metadata = {
  title: "WhatsApp Chatbot SaaS",
  description: "WhatsApp Chatbot Yönetim Paneli",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      {/*
        HİDRASYON UYARISINI SUSTUR:
        Tarayıcı eklentilerinin (bis_register vb.) 
        eklediği fazladan nitelikler nedeniyle oluşan
        hatayı bastırmak için suppressHydrationWarning eklendi.
      */}
      <body
        className="bg-gray-100 text-gray-900"
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
