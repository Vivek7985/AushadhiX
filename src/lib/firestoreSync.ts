import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db, isFirestoreQuotaExhausted, markFirestoreQuotaExhausted } from './firebase';
import {
  Product,
  ProductBatch,
  Sale,
  Supplier,
  Customer,
  PurchaseOrder,
  StockLedgerEntry,
  StoreSettings,
  ProductCategory,
  SupplierOrderList,
} from '../types';

export function handleQuotaErrorIfPresent(err: any): boolean {
  if (!err) return false;
  const msg = err.message || String(err);
  const code = err.code || '';
  if (
    code === 'resource-exhausted' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted')
  ) {
    markFirestoreQuotaExhausted(msg);
    return true;
  }
  return false;
}

// Collection references
export const COLLECTIONS = {
  PRODUCTS: 'products',
  BATCHES: 'batches',
  SALES: 'sales',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  PURCHASE_ORDERS: 'purchase_orders',
  STOCK_LEDGER: 'stock_ledger',
  SETTINGS: 'settings',
  CATEGORIES: 'categories',
  SUPPLIER_ORDER_LISTS: 'supplier_order_lists',
} as const;

/**
 * Real-time listener subscription hook for Web & Mobile synchronization
 */
export function subscribeToPharmacyFirestore(callbacks: {
  onProducts?: (products: Product[]) => void;
  onBatches?: (batches: ProductBatch[]) => void;
  onSales?: (sales: Sale[]) => void;
  onSuppliers?: (suppliers: Supplier[]) => void;
  onCustomers?: (customers: Customer[]) => void;
  onPurchaseOrders?: (pos: PurchaseOrder[]) => void;
  onStockLedger?: (ledger: StockLedgerEntry[]) => void;
  onSettings?: (settings: StoreSettings) => void;
  onCategories?: (categories: ProductCategory[]) => void;
  onSupplierOrderLists?: (lists: SupplierOrderList[]) => void;
}) {
  const unsubscribers: (() => void)[] = [];

  // If daily quota is currently exhausted, listeners cannot subscribe without errors
  if (isFirestoreQuotaExhausted()) {
    return () => {};
  }

  try {
    if (callbacks.onProducts) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.PRODUCTS), (snapshot) => {
        if (!snapshot.empty) {
          const items: Product[] = [];
          snapshot.forEach((d) => items.push(d.data() as Product));
          callbacks.onProducts!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Products sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onBatches) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.BATCHES), (snapshot) => {
        if (!snapshot.empty) {
          const items: ProductBatch[] = [];
          snapshot.forEach((d) => items.push(d.data() as ProductBatch));
          callbacks.onBatches!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Batches sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onSales) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.SALES), (snapshot) => {
        if (!snapshot.empty) {
          const items: Sale[] = [];
          snapshot.forEach((d) => items.push(d.data() as Sale));
          callbacks.onSales!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Sales sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onSuppliers) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.SUPPLIERS), (snapshot) => {
        if (!snapshot.empty) {
          const items: Supplier[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Supplier;
            items.push({
              ...data,
              totalPurchases: Number(data.totalPurchases || 0),
              pendingBalance: Number(data.pendingBalance || 0),
            });
          });
          callbacks.onSuppliers!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Suppliers sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onCustomers) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.CUSTOMERS), (snapshot) => {
        if (!snapshot.empty) {
          const items: Customer[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Customer;
            items.push({
              ...data,
              totalSpent: Number(data.totalSpent || 0),
              totalOrders: Number(data.totalOrders || 0),
              pendingBalance: Number(data.pendingBalance || 0),
            });
          });
          callbacks.onCustomers!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Customers sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onPurchaseOrders) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.PURCHASE_ORDERS), (snapshot) => {
        if (!snapshot.empty) {
          const items: PurchaseOrder[] = [];
          snapshot.forEach((d) => items.push(d.data() as PurchaseOrder));
          callbacks.onPurchaseOrders!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] PO sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onStockLedger) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.STOCK_LEDGER), (snapshot) => {
        if (!snapshot.empty) {
          const items: StockLedgerEntry[] = [];
          snapshot.forEach((d) => items.push(d.data() as StockLedgerEntry));
          callbacks.onStockLedger!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Stock ledger sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onSettings) {
      const unsub = onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'store_settings'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as StoreSettings;
          callbacks.onSettings!(data);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Settings sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onCategories) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.CATEGORIES), (snapshot) => {
        if (!snapshot.empty) {
          const items: ProductCategory[] = [];
          snapshot.forEach((d) => items.push(d.data() as ProductCategory));
          callbacks.onCategories!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] Categories sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }

    if (callbacks.onSupplierOrderLists) {
      const unsub = onSnapshot(collection(db, COLLECTIONS.SUPPLIER_ORDER_LISTS), (snapshot) => {
        if (!snapshot.empty) {
          const items: SupplierOrderList[] = [];
          snapshot.forEach((d) => items.push(d.data() as SupplierOrderList));
          callbacks.onSupplierOrderLists!(items);
        }
      }, (err) => {
        if (!handleQuotaErrorIfPresent(err)) {
          console.warn('[FirestoreSync] SupplierOrderLists sync listener notice:', err);
        }
      });
      unsubscribers.push(unsub);
    }
  } catch (err) {
    if (!handleQuotaErrorIfPresent(err)) {
      console.warn('[FirestoreSync] Error setting up listeners:', err);
    }
  }

  return () => {
    unsubscribers.forEach((fn) => fn());
  };
}

/**
 * Sanitizer utility to remove undefined fields recursively so Firestore setDoc never fails.
 * Firestore strictly forbids `undefined` field values.
 */
export function sanitizeForFirestore<T>(data: T): any {
  if (data === undefined || data === null) return null;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value;
  }));
}

/**
 * Write operations to sync data to Firestore for multi-platform sync
 */
export async function syncProductToFirestore(product: Product): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(product);
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, product.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncProduct failed:', e);
    }
  }
}

export async function syncBatchToFirestore(batch: ProductBatch): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(batch);
    await setDoc(doc(db, COLLECTIONS.BATCHES, batch.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncBatch failed:', e);
    }
  }
}

export async function syncSaleToFirestore(sale: Sale): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const cleanSale = sanitizeForFirestore(sale);
    await setDoc(doc(db, COLLECTIONS.SALES, sale.id), cleanSale, { merge: true });
    console.log('[FirestoreSync] Successfully persisted sale to Cloud Firestore:', sale.id);
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.error('[FirestoreSync] syncSale failed:', e);
    }
  }
}

export async function syncSupplierToFirestore(supplier: Supplier): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(supplier);
    await setDoc(doc(db, COLLECTIONS.SUPPLIERS, supplier.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncSupplier failed:', e);
    }
  }
}

export async function syncCustomerToFirestore(customer: Customer): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(customer);
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncCustomer failed:', e);
    }
  }
}

export async function syncPurchaseOrderToFirestore(po: PurchaseOrder): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(po);
    await setDoc(doc(db, COLLECTIONS.PURCHASE_ORDERS, po.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncPO failed:', e);
    }
  }
}

export async function syncStockLedgerToFirestore(entry: StockLedgerEntry): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(entry);
    await setDoc(doc(db, COLLECTIONS.STOCK_LEDGER, entry.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncStockLedger failed:', e);
    }
  }
}

/**
 * Persist Business / Store Settings to Cloud Firestore so Mobile and Web stay in 100% sync
 */
export async function syncSettingsToFirestore(settings: StoreSettings): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(settings);
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'store_settings'), clean, { merge: true });
    console.log('[FirestoreSync] Successfully synced business information to Cloud Firestore:', settings.storeName);
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.error('[FirestoreSync] syncSettings failed:', e);
    }
  }
}

/**
 * Fetch business settings from Firestore directly
 */
export async function getSettingsFromFirestore(): Promise<StoreSettings | null> {
  if (isFirestoreQuotaExhausted()) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'store_settings'));
    if (snap.exists()) {
      return snap.data() as StoreSettings;
    }
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] getSettingsFromFirestore error:', e);
    }
  }
  return null;
}

export async function syncCategoryToFirestore(category: ProductCategory): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(category);
    await setDoc(doc(db, COLLECTIONS.CATEGORIES, category.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncCategory failed:', e);
    }
  }
}

export async function syncSupplierOrderListToFirestore(list: SupplierOrderList): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    const clean = sanitizeForFirestore(list);
    await setDoc(doc(db, COLLECTIONS.SUPPLIER_ORDER_LISTS, list.id), clean, { merge: true });
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] syncSupplierOrderList failed:', e);
    }
  }
}

export async function deleteSupplierOrderListFromFirestore(id: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SUPPLIER_ORDER_LISTS, id));
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] deleteSupplierOrderList failed:', e);
    }
  }
}

export async function deleteProductFromFirestore(id: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    console.log('[FirestoreSync] Successfully deleted product from Firestore:', id);
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] deleteProduct failed:', e);
    }
  }
}

export async function deleteBatchFromFirestore(id: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.BATCHES, id));
    console.log('[FirestoreSync] Successfully deleted batch from Firestore:', id);
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] deleteBatch failed:', e);
    }
  }
}

export async function deleteSaleFromFirestore(id: string, invoiceNumber?: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SALES, id));
    if (invoiceNumber && invoiceNumber !== id) {
      await deleteDoc(doc(db, COLLECTIONS.SALES, invoiceNumber)).catch(() => {});
    }
    console.log('[FirestoreSync] Successfully deleted sale from Firestore:', id, invoiceNumber);
  } catch (e) {
    if (!handleQuotaErrorIfPresent(e)) {
      console.warn('[FirestoreSync] deleteSale failed:', e);
    }
  }
}

/**
 * Initialize Firestore database with pharmacy catalog so Mobile and Web both start populated
 */
export async function seedFirestoreIfEmpty(data: {
  products: Product[];
  batches: ProductBatch[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseOrders: PurchaseOrder[];
  sales: Sale[];
  stockLedger: StockLedgerEntry[];
  settings?: StoreSettings;
  categories?: ProductCategory[];
}) {
  if (isFirestoreQuotaExhausted()) return;
  if (typeof window !== 'undefined' && localStorage.getItem('aushadhix_firestore_seeded') === 'true') {
    return;
  }
  try {
    const existing = await getDocs(query(collection(db, COLLECTIONS.PRODUCTS), limit(1)));
    if (existing.empty && data.products.length > 0) {
      console.log('[FirestoreSync] Seeding initial pharmacy catalog to Firestore for mobile & web...');
      const batch = writeBatch(db);

      data.products.forEach((p) => {
        batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), sanitizeForFirestore(p));
      });

      data.batches.forEach((b) => {
        batch.set(doc(db, COLLECTIONS.BATCHES, b.id), sanitizeForFirestore(b));
      });

      data.suppliers.forEach((s) => {
        batch.set(doc(db, COLLECTIONS.SUPPLIERS, s.id), sanitizeForFirestore(s));
      });

      data.customers.forEach((c) => {
        batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), sanitizeForFirestore(c));
      });

      if (data.purchaseOrders && data.purchaseOrders.length > 0) {
        data.purchaseOrders.forEach((po) => {
          batch.set(doc(db, COLLECTIONS.PURCHASE_ORDERS, po.id), sanitizeForFirestore(po));
        });
      }

      if (data.sales && data.sales.length > 0) {
        data.sales.forEach((s) => {
          batch.set(doc(db, COLLECTIONS.SALES, s.id), sanitizeForFirestore(s));
        });
      }

      if (data.categories && data.categories.length > 0) {
        data.categories.forEach((cat) => {
          batch.set(doc(db, COLLECTIONS.CATEGORIES, cat.id), sanitizeForFirestore(cat));
        });
      }

      await batch.commit();
      console.log('[FirestoreSync] Successfully seeded base data to Firestore!');
      if (typeof window !== 'undefined') {
        localStorage.setItem('aushadhix_firestore_seeded', 'true');
      }
    } else if (!existing.empty) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aushadhix_firestore_seeded', 'true');
      }
    }

    // Always ensure settings document is initialized in Firestore
    if (data.settings) {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'store_settings'));
      if (!snap.exists()) {
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'store_settings'), sanitizeForFirestore(data.settings), { merge: true });
        console.log('[FirestoreSync] Seeded initial store_settings to Firestore');
      }
    }
  } catch (err) {
    if (!handleQuotaErrorIfPresent(err)) {
      console.warn('[FirestoreSync] Seed notice:', err);
    }
  }
}

