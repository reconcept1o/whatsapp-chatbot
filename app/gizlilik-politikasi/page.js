// app/gizlilik-politikasi/page.js
export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 my-10 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Gizlilik Politikası</h1>
      <p className="mb-4 text-gray-700">
        WhatsApp Chatbot SaaS Platformu, kullanıcı verilerinin gizliliğine büyük
        önem vermektedir. Bu platform, WhatsApp ve Supabase üzerinden aldığımız
        verileri (mesajlar, e-posta, isim) sadece bot hizmetini sunmak, akışları
        yönetmek ve hizmet kalitesini artırmak amacıyla işler.
      </p>
      <p className="mb-4 text-gray-700">
        Topladığımız veriler, üçüncü taraflarla **asla** paylaşılmaz veya
        satılmaz. Bot hizmeti sona erdiğinde, müşterinin talebi üzerine tüm
        veriler sistemimizden silinir.
      </p>
      <p className="text-sm text-gray-500">Son Güncelleme: 26 Ekim 2025</p>Bize Ulaşın
    </div>
  );
}
