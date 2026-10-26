# Sticker Tau — PCG Raw Materials (Prototype)

A local-first prototype for receiving raw materials and printing 4×4 inch labels.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL shown by Vite.

## What this prototype does
- Create inbound receipts with multiple SKUs / lots.
- Supports PO, supplier delivery note, and general/manual receiving.
- Add multiple photos per inbound item; photos and records are saved in this browser using IndexedDB.
- Search receipt history by SKU, lot, document, supplier, or date.
- Print a 4×4 inch label for an item, including SKU, barcode, LOT, manufacture/expiry dates, quantity/weight, receiver, pallet code, and QR code.
- Export/import a JSON backup.

## Important limitations
- This is a local-only prototype. Data is not shared across devices/users.
- Browser storage can be cleared or lost; export backups regularly.
- Barcode and QR code are generated from the values entered. Scan-test before operational use.
- Review the print dialog and choose a label printer configured for 4×4 inch media.
- Do not enter confidential production data until PCG approves the prototype and its storage/security approach.
