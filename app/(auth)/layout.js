// app/(auth)/layout.js

export default function AuthLayout({ children }) {
  // Bu layout, içindeki 'children'ı (örn: login/page.js)
  // ekranın ortasına yerleştirir.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      {children}
    </div>
  );
}
