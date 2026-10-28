{/* --- ส่วนที่ 1: ฟังก์ชันกดลบข้อมูลใบรับสินค้าจาก IndexedDB --- */}
{(() => {
  if (!window.deleteReceiptItem) {
    window.deleteReceiptItem = async (id) => {
      if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการรับสินค้านี้?")) return;
      try {
        // เชื่อมต่อตัวฐานข้อมูลของระบบ (อิงเวอร์ชันล่าสุดคือเวอร์ชัน 2)
        const db = await openDB('sticker-tau-pcg', 2);
        const tx = db.transaction('receipts', 'readwrite');
        await tx.objectStore('receipts').delete(id);
        await tx.done;
        
        alert("ลบรายการรับสินค้าเรียบร้อยแล้ว");
        window.location.reload(); // สั่งรีเฟรชหน้าจออัปเดตข้อมูลทันที
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการลบใบรับสินค้า:", error);
        alert("ไม่สามารถลบข้อมูลได้เนื่องจากระบบขัดข้อง");
      }
    };
  }
})()}

{/* --- ส่วนที่ 2: ปุ่มกดลบ (UI Button) สำหรับวางในหน้ารับสินค้า --- */}
{/* นำกลุ่มโค้ดปุ่มนี้ไปวางข้างๆ ปุ่มพิมพ์สติกเกอร์ 4x4 นิ้ว หรือปุ่มดูประวัติรับสินค้าเดิม */}
<button
  onClick={() => window.deleteReceiptItem(item.id || item.receiptId || item.lot)} 
  className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded text-sm transition-all duration-200 shadow-sm mt-2"
  title="ลบใบรับสินค้านี้"
>
  <svg xmlns="http://w3.org" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
  <span>ลบประวัติรับสินค้า</span>
</button>
