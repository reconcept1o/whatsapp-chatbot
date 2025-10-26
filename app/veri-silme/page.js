// app/veri-silme/page.js
export default function DataDeletionPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 my-10 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Veri Silme Talimatı</h1>
      <p className="mb-4 text-gray-700">
        Kullanıcılar, bu hizmet aracılığıyla toplanan tüm kişisel verilerinin
        (mesajlar, adlar vb.) silinmesini talep etme hakkına sahiptir.
      </p>
      <p className="mb-4 text-gray-700">
        Verilerinizi silmek için lütfen yöneticiniz olarak
        [reconcept0x@gmail.com] adresine bir e-posta gönderin. Talebiniz
        onaylandıktan sonra, verileriniz sistemimizden 7 iş günü içinde kalıcı
        olarak silinecektir.
      </p>
    </div>
  );
}
