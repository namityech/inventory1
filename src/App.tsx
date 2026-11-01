/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import {
  Product, Category, Supplier, Batch, StockMovement,
  InventoryNotification, DashboardSummary
} from './types/inventory';
import { Header } from './components/common/Header';
import { Sidebar, NavigationItemKey } from './components/common/Sidebar';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { ProductFormModal } from './components/products/ProductFormModal';
import { BatchesView } from './components/batches/BatchesView';
import { BatchFormModal } from './components/batches/BatchFormModal';
import { StockMovementsView } from './components/movements/StockMovementsView';
import { RecordMovementModal } from './components/movements/RecordMovementModal';
import { RestockView } from './components/restock/RestockView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthView } from './components/auth/AuthView';

function InventoryApp() {
  const { user, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<NavigationItemKey>('dashboard');

  // Application Data States
  const [dashboardData, setDashboardData] = useState<{
    summary: DashboardSummary;
    expiryDistribution: any;
    monthlyMovements: any[];
    fastMoving: any[];
    slowMoving: any[];
    recentMovements: StockMovement[];
    urgentAlerts: InventoryNotification[];
    valuationByCategory: any[];
  } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [notifications, setNotifications] = useState<InventoryNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modal Controls
  const [isRecordMovementOpen, setIsRecordMovementOpen] = useState(false);
  const [movementInitialProduct, setMovementInitialProduct] = useState<Product | null>(null);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [batchInitialProduct, setBatchInitialProduct] = useState<Product | null>(null);

  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Fetch full inventory system state
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    try {
      const [
        dashRes,
        prodRes,
        catRes,
        supRes,
        batchRes,
        movRes,
        notifRes
      ] = await Promise.all([
        api.getDashboard(),
        api.getProducts(),
        api.getCategories(),
        api.getSuppliers(),
        api.getBatches(),
        api.getStockMovements({ limit: 80 }),
        api.getNotifications()
      ]);

      setDashboardData(dashRes);
      setProducts(prodRes.products);
      setCategories(catRes.categories);
      setSuppliers(supRes.suppliers);
      setBatches(batchRes.batches);
      setMovements(movRes.movements);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user, refreshAllData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md animate-pulse">
            SI
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Loading Smart Inventory...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // Quick Action Handler for Top Bar button
  const handleTopQuickAction = () => {
    if (currentView === 'products') {
      setEditingProduct(null);
      setIsProductFormOpen(true);
    } else if (currentView === 'batches') {
      setBatchInitialProduct(null);
      setIsBatchFormOpen(true);
    } else {
      setMovementInitialProduct(null);
      setIsRecordMovementOpen(true);
    }
  };

  const quickActionLabels: Record<string, string> = {
    products: '+ Add Product',
    batches: '+ Receive Batch',
    movements: '+ Record Issue',
    dashboard: '+ Record Issue'
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        unreadCount={unreadCount}
        criticalExpiryCount={dashboardData?.summary?.criticalExpiringCount}
        lowStockCount={dashboardData?.summary?.lowStockProductsCount}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <Header
          currentView={currentView}
          unreadCount={unreadCount}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          onQuickAction={handleTopQuickAction}
          quickActionLabel={quickActionLabels[currentView] || '+ Record Issue'}
        />

        {/* Viewport Content */}
        <main className="flex-1 pb-12">
          {currentView === 'dashboard' && (
            <DashboardView
              summary={dashboardData?.summary || null}
              expiryDistribution={dashboardData?.expiryDistribution || { expired: 0, critical: 0, warning: 0, upcoming: 0, safe: 0 }}
              monthlyMovements={dashboardData?.monthlyMovements || []}
              fastMoving={dashboardData?.fastMoving || []}
              slowMoving={dashboardData?.slowMoving || []}
              recentMovements={dashboardData?.recentMovements || []}
              urgentAlerts={dashboardData?.urgentAlerts || []}
              valuationByCategory={dashboardData?.valuationByCategory || []}
              onNavigate={setCurrentView}
              onRecordMovement={() => {
                setMovementInitialProduct(null);
                setIsRecordMovementOpen(true);
              }}
              onAddProduct={() => {
                setEditingProduct(null);
                setIsProductFormOpen(true);
              }}
              onRefresh={refreshAllData}
              loading={loading}
            />
          )}

          {currentView === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              suppliers={suppliers}
              onAddProduct={() => {
                setEditingProduct(null);
                setIsProductFormOpen(true);
              }}
              onEditProduct={p => {
                setEditingProduct(p);
                setIsProductFormOpen(true);
              }}
              onDeleteProduct={async p => {
                await api.deleteProduct(p.id);
                await refreshAllData();
              }}
              onSelectProduct={id => setSelectedProductId(id)}
              onAddBatch={p => {
                setBatchInitialProduct(p);
                setIsBatchFormOpen(true);
              }}
              onRecordMovement={p => {
                setMovementInitialProduct(p || null);
                setIsRecordMovementOpen(true);
              }}
              loading={loading}
            />
          )}

          {currentView === 'batches' && (
            <BatchesView
              batches={batches}
              products={products}
              suppliers={suppliers}
              onRefresh={refreshAllData}
              loading={loading}
            />
          )}

          {currentView === 'movements' && (
            <StockMovementsView
              movements={movements}
              products={products}
              onRefresh={refreshAllData}
              loading={loading}
            />
          )}

          {currentView === 'restock' && (
            <RestockView
              products={products}
              suppliers={suppliers}
              onRefreshAll={refreshAllData}
            />
          )}

          {currentView === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              categories={categories}
              onRefresh={refreshAllData}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'notifications' && (
            <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Notification Center</h2>
                  <p className="text-xs text-slate-500 mt-1">Real-time statutory expiry warnings and low-stock replenishment notices</p>
                </div>
                <button
                  onClick={() => api.markAllNotificationsRead().then(refreshAllData)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Mark All as Read
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => (
                  <div key={n.id} className={`p-4 flex items-start justify-between gap-4 ${n.is_read ? 'opacity-65' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${n.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">({n.type})</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => api.markNotificationRead(n.id).then(refreshAllData)}
                        className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline shrink-0"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'users' && (
            <UsersView />
          )}

          {currentView === 'settings' && (
            <SettingsView onRefreshAll={refreshAllData} />
          )}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onRefresh={refreshAllData}
        onSelectProduct={id => setSelectedProductId(id)}
      />

      <ProductDetailModal
        productId={selectedProductId}
        isOpen={Boolean(selectedProductId)}
        onClose={() => setSelectedProductId(null)}
        onAddBatch={p => {
          setBatchInitialProduct(p);
          setIsBatchFormOpen(true);
        }}
        onRefresh={refreshAllData}
      />

      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => {
          setIsProductFormOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={refreshAllData}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
      />

      <BatchFormModal
        isOpen={isBatchFormOpen}
        onClose={() => {
          setIsBatchFormOpen(false);
          setBatchInitialProduct(null);
        }}
        onSuccess={refreshAllData}
        products={products}
        suppliers={suppliers}
        initialProduct={batchInitialProduct}
      />

      <RecordMovementModal
        isOpen={isRecordMovementOpen}
        onClose={() => {
          setIsRecordMovementOpen(false);
          setMovementInitialProduct(null);
        }}
        onSuccess={refreshAllData}
        products={products}
        initialProduct={movementInitialProduct}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InventoryApp />
    </AuthProvider>
  );
}
