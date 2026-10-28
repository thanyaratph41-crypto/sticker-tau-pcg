import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {openDB} from 'idb';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';
import {LayoutDashboard, PackagePlus, History, Printer, Database, Camera, Search, Download, Upload, Plus, Trash2, Save, ClipboardList, ShieldAlert, Image as ImageIcon, X, Menu, ChevronRight, FileText, CheckCircle2, Boxes, ClipboardCheck} from 'lucide-react';
import './style.css';

const DB_NAME='sticker-tau-pcg-local-v1';
const today=()=>new Date().toISOString().slice(0,10);
const newId=()=>crypto.randomUUID();
const blankItem=()=>({id:newId(),heading:'',lpn:'',vehicle:'',sabCode:'',sku:'',barcode:'',name:'',qty:'',unit:'ถุง',weight:'',lot:'',mfg:'',exp:'',palletCode:'',photos:[],notes:''});
const blankReceipt=()=>({id:newId(),receiptNo:'',date:today(),type:'PO',supplier:'',referenceNo:'',receiver:'',status:'draft',notes:'',items:[blankItem()],createdAt:new Date().toISOString()});

async function db(){
  return openDB(DB_NAME,3,{
    upgrade(d,oldVersion){
      if(oldVersion<1){
        d.createObjectStore('receipts',{keyPath:'id'});
        d.createObjectStore('settings',{keyPath:'key'});
      }
      if(!d.objectStoreNames.contains('fiveS')){
        d.createObjectStore('fiveS',{keyPath:'id'});
      }
    }
  });
}

async function allFiveS(){const d=await db();return (await d.getAll('fiveS')).sort((a,b)=>(b.updatedAt||b.date||'').localeCompare(a.updatedAt||a.date||''));}
async function saveFiveS(record){const d=await db();await d.put('fiveS',record);return record;}
async function deleteFiveS(id){const d=await db();await d.delete('fiveS',id);}

async function allReceipts(){const d=await db();return (await d.getAll('receipts')).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));}
async function saveReceipt(r){const d=await db();await d.put('receipts',r);return r;}
async function deleteReceipt(id){const d=await db();await d.delete('receipts',id);}

function fmtDate(s){if(!s)return '—';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`;}

function App(){
 const [page,setPage]=useState('dashboard'),[excelView,setExcelView]=useState('hub'),[receipts,setReceipts]=useState([]),[receipt,setReceipt]=useState(blankReceipt()),[query,setQuery]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[selected,setSelected]=useState(null),[navOpen,setNavOpen]=useState(false),[showPhotos,setShowPhotos]=useState(null),[stagedExcel,setStagedExcel]=useState(null),[excelReceiver,setExcelReceiver]=useState(''),[selectedPrint,setSelectedPrint]=useState({}),[printCopies,setPrintCopies]=useState({}),[fiveSRecords,setFiveSRecords]=useState([]),[fiveSForm,setFiveSForm]=useState(blankFiveS()),[fiveSEditId,setFiveSEditId]=useState(null),[fiveSReportFrom,setFiveSReportFrom]=useState(''),[fiveSReportTo,setFiveSReportTo]=useState(''),[fiveSReportQuery,setFiveSReportQuery]=useState('');
 const importRef=useRef(null);
 
 const refresh=async()=>{
   try {
     setReceipts(await allReceipts());
     setFiveSRecords(await allFiveS());
   } catch(e) {
     setNotice('โหลดข้อมูลไม่สำเร็จ');
   }
 };
 
 useEffect(()=>{refresh().catch(()=>setNotice('เปิดฐานข้อมูลในเบราว์เซอร์ไม่สำเร็จ'));},[]);
 const notify=(s)=>{setNotice(s);setTimeout(()=>setNotice(''),4000)};
 
 const totalItems=receipts.reduce((n,r)=>n+(r.items||[]).length,0);
 const totalQty=receipts.reduce((n,r)=>n+(r.items||[]).reduce((a,i)=>a+(Number(i.qty)||0),0),0);
 
 const filtered=useMemo(()=>receipts.filter(r=>{
  const hay=[r.receiptNo,r.supplier,r.referenceNo,r.receiver,r.type,...(r.items||[]).flatMap(i=>[i.sku,i.name,i.lot,i.barcode,i.palletCode])].join(' ').toLowerCase();
  return hay.includes(query.toLowerCase())&&(!from||r.date>=from)&&(!to||r.date<=to);
 }),[receipts,query,from,to]);

 const handleDeleteReceipt=async(id)=>{
   if(!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการรับสินค้านี้ออกจากระบบ?")) return;
   try{
     await deleteReceipt(id);
     notify("ลบรายการรับสินค้าเรียบร้อยแล้ว");
     await refresh();
   }catch(e){
     notify("เกิดข้อผิดพลาดในการลบข้อมูล");
   }
 };

 const handleDeleteFiveS=async(id)=>{
   if(!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการ 5ส. นี้ออกจากระบบ?")) return;
   try{
     await deleteFiveS(id);
     notify("ลบรายการกิจกรรม 5ส. เรียบร้อยแล้ว");
     await refresh();
   }catch(e){
     notify("เกิดข้อผิดพลาดในการลบข้อมูล 5ส.");
   }
 };

 return (
   <div className="app-shell flex font-sans antialiased text-[#202b3c] bg-[#f5f7fb]">
     {/* Sidebar Navigation */}
     <aside className={`sidebar ${navOpen ? 'block' : 'hidden md:flex'}`}>
       <div className="brand">
         <div className="brand-mark"><span>PCG</span><i></i></div>
         <div className="brand-copy"><b>Sticker Tau</b><small>RAW MATERIALS</small></div>
       </div>
       <nav className="flex-1 space-y-1">
         <button onClick={()=>{setPage('dashboard'); setNavOpen(false);}} className={`nav-item ${page==='dashboard'?'active':''}`}><LayoutDashboard size={18}/><span>หน้าหลัก</span></button>
         <button onClick={()=>{setPage('receive'); setNavOpen(false);}} className={`nav-item ${page==='receive'?'active':''}`}><PackagePlus size={18}/><span>รับสินค้าเข้า</span></button>
         <button onClick={()=>{setPage('history'); setNavOpen(false);}} className={`nav-item ${page==='history'?'active':''}`}><History size={18}/><span>ประวัติรับสินค้า</span></button>
         <button onClick={()=>{setPage('fives'); setNavOpen(false);}} className={`nav-item ${page==='fives'?'active':''}`}><ClipboardCheck size={18}/><span>กิจกรรม 5ส.</span></button>
       </nav>
       <div className="sidebar-bottom"><span>V1.0.0 (Local-First)</span></div>
     </aside>

     {/* Main Area */}
     <main className="main flex-1 min-h-screen md:ml-[250px]">
       <header className="topbar">
         <button onClick={()=>setNavOpen(!navOpen)} className="md:hidden p-2"><Menu size={20}/></button>
         <div className="breadcrumb">คลังสินค้า / <b>{page==='dashboard'?'หน้าหลัก':page==='receive'?'รับสินค้าเข้า':page==='history'?'ประวัติรับสินค้า':'กิจกรรม 5ส.'}</b></div>
         {notice && <div className="bg-[#fff5e5] text-[#a46a15] px-4 py-2 rounded-lg text-xs font-semibold shadow-sm">{notice}</div>}
       </header>

       <div className="content">
         {/* หน้าประวัติรับสินค้า (History Page) */}
         {page==='history' && (
           <div className="space-y-6">
             <div className="page-heading">
               <div><h1>ประวัติการรับสินค้าเข้า</h1><p>รายการเอกสารและประวัติการบันทึกข้อมูลวัตถุดิบทั้งหมดในระบบ</p></div>
             </div>
             <div className="table-wrap bg-white rounded-xl shadow-sm border border-[#e6eaf0] overflow-hidden">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-[#fafbfd] border-bottom border-[#e9edf2]">
                     <th className="p-4 text-xs font-bold text-[#8b96a5]">เลขที่เอกสาร / วันที่</th>
                     <th className="p-4 text-xs font-bold text-[#8b96a5]">ผู้เช็คหน่วยงาน</th>
                     <th className="p-4 text-xs font-bold text-[#8b96a5]">รายการสินค้าวัตถุดิบ</th>
                     <th className="p-4 text-xs font-bold text-[#8b96a5]">สถานะ</th>
                     <th className="p-4 text-xs font-bold text-[#8b96a5]">การจัดการ</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filtered.map(r => (
                     <tr key={r.id} className="border-bottom border-[#eef1f5] hover:bg-[#fcfdff]">
                       <td className="p-4 text-sm font-medium">
                         <div className="text-[#1f2a3a]">{r.receiptNo}</div>
                         <div className="text-xs text-[#9aa3b0] mt-1">{fmtDate(r.date)}</div>
                       </td>
                       <td className="p-4 text-sm text-[#586579]">{r.receiver}</td>
                       <td className="p-4 text-sm">
                         {(r.items || []).map((i, idx) => (
                           <div key={i.id || idx} className="sku-line text-xs my-1">
                             <b className="text-[#37465b]">{i.sku}</b> - <span className="text-[#586579]">{i.name}</span> <span className="text-[#929dac]">({i.qty} {i.unit})</span>
                           </div>
                         ))}
                       </td>
                       <td className="p-4">
                         <span className={`status-pill ${r.status==='confirmed'?'confirmed':'draft'}`}>
                           {r.status==='confirmed'?'ยืนยันแล้ว':'รี้ดร่าง'}
                         </span>
                       </td>
                       <td className="p-4">
                         <div className="flex gap-2">
                           <button onClick={()=>{setReceipt(structuredClone(r)); setPage('receive');}} className="btn btn-outline btn-sm">แก้ไข</button>
                           <button onClick={()=>handleDeleteReceipt(r.id)} className="btn btn-outline btn-sm border-red-200 hover:bg-red-50 text-red-600 flex items-center gap-1"><Trash2 size={14}/><span>ลบ</span></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                   {filtered.length===0 && (
                     <tr><td colSpan="5" className="p-8 text-center text-sm text-[#8792a2]">ไม่พบประวัติข้อมูลตามเงื่อนไขค้นหา</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
         )}

         {/* หน้ากิจกรรม 5ส. */}
         {page==='fives' && (
           <div className="space-y-6">
             <div className="page-heading">
               <div><h1>บันทึกกิจกรรม 5ส.</h1><p>จัดการข้อมูลกิจกรรมคลังสินค้าปลอดภัยและสะอาดยั่งยืน</p></div>
