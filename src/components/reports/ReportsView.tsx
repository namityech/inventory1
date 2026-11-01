import React, { useState, useEffect } from 'react';
import {
  FileBarChart2, Download, DollarSign, AlertTriangle, TrendingDown,
  TrendingUp, Calendar, Filter, RefreshCw, FileText, CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, LineChart, Line
} from 'recharts';
import { api } from '../../services/api';

export const ReportsView: React.FC = () => {
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<'valuation' | 'movements' | 'risk' | 'disposals'>('valuation');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalyticsReport();
      setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportRiskCSV = () => {
    if (!reportData?.detailedRisk) return;
    const headers = ['Product Name', 'SKU', 'Batch No', 'Expiry Date', 'Days Left', 'Status', 'Remaining Qty', 'Unit Cost ($)', 'Loss Risk ($)'];
    const rows = reportData.detailedRisk.map((r: any) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.sku}"`,
      `"${r.batch_number}"`,
      `"${r.expiry_date}"`,
      r.days_to_expiry,
      `"${r.status}"`,
      r.remaining_quantity,
      r.purchase_price,
      r.loss_risk.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Expiry_Risk_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDisposalCSV = () => {
    if (!reportData?.disposalAudit) return;
    const headers = ['Ref No', 'Date', 'Product', 'SKU', 'Batch', 'Disposed Qty', 'Unit Cost ($)', 'Total Loss ($)', 'Method', 'Reason', 'Disposed By', 'Certificate No'];
    const rows = reportData.disposalAudit.map((d: any) => [
      `"${d.reference_no}"`,
      `"${d.created_at}"`,
      `"${d.product_name}"`,
      `"${d.sku}"`,
      `"${d.batch_number || 'N/A'}"`,
      d.quantity,
      d.unit_cost,
      d.total_loss.toFixed(2),
      `"${d.disposal_method}"`,
      `"${(d.reason || '').replace(/"/g, '""')}"`,
      `"${d.disposed_by_name || 'Staff'}"`,
      `"${d.certificate_no}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Waste_Disposal_Certificates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-teal-600" />
            <span>Inventory Valuation & Regulatory Audit Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Financial capital at risk, disposal write-off certificates, and periodic consumption trends
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={activeReportTab === 'disposals' ? exportDisposalCSV : exportRiskCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report CSV</span>
          </button>
        </div>
      </div>

      {/* Daily Snapshot Strip */}
      {reportData?.dailySummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 block">Today's Inward Purchases</span>
            <span className="text-lg font-bold font-mono text-teal-600 tabular-nums block mt-1">
              +{reportData.dailySummary.incoming_units} units
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Stock delivery intake</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 block">Today's Sales & Dispenses</span>
            <span className="text-lg font-bold font-mono text-blue-600 tabular-nums block mt-1">
              -{reportData.dailySummary.outgoing_units} units
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
              Revenue: ${reportData.dailySummary.sales_value.toFixed(2)}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">
              Today's Written-Off Waste
            </span>
            <span className="text-lg font-bold font-mono text-rose-600 tabular-nums block mt-1">
              {reportData.dailySummary.disposal_units} units
            </span>
            <span className="text-[10px] text-rose-500 mt-0.5 block font-mono">
              Loss: ${reportData.dailySummary.disposal_loss.toFixed(2)}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 block">Audited Disposals Ledger</span>
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
              {reportData?.disposalAudit?.length || 0} Certificates
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Permanent write-off trail</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveReportTab('valuation')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeReportTab === 'valuation'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Weekly Movement Trends
        </button>
        <button
          onClick={() => setActiveReportTab('risk')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeReportTab === 'risk'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Expiry Financial Risk Exposure ({reportData?.detailedRisk?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('disposals')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeReportTab === 'disposals'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Waste & Disposal Certificates ({reportData?.disposalAudit?.length || 0})
        </button>
      </div>

      {/* TAB 1: WEEKLY TRENDS */}
      {activeReportTab === 'valuation' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                7-Day Inward Intake vs Outward Consumption Velocity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of replenished purchases vs dispensed stock units by date
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData?.weeklyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="purchased" name="Purchased In" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumed" name="Dispensed Out" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top restocked products */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Most Frequently Replenished Products
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {reportData?.frequentlyRestocked?.map((item: any) => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                  <span className="text-[11px] font-mono text-slate-400 block mt-0.5">{item.sku}</span>
                  <div className="mt-2 flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-500">Restock Orders:</span>
                    <span className="font-mono font-bold text-teal-600 tabular-nums">{item.restock_orders_count} orders</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
                    <span>Total Received:</span>
                    <span className="font-mono tabular-nums">{item.total_units_received} units</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED EXPIRY RISK EXPOSURE */}
      {activeReportTab === 'risk' && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Detailed Batch-Level Expiry Exposure (&le;30 Days)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact capital value at risk calculated as remaining batch quantity &times; unit purchase cost
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Product Name & SKU</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3 font-mono">Expiry Date</th>
                  <th className="px-4 py-3">Milestone Status</th>
                  <th className="px-4 py-3 text-right">Units at Risk</th>
                  <th className="px-4 py-3 text-right">Purchase Unit Cost</th>
                  <th className="px-4 py-3 text-right">Estimated Financial Loss Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData?.detailedRisk?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No stock batches expiring within the next 30 days.
                    </td>
                  </tr>
                ) : (
                  reportData?.detailedRisk?.map((r: any) => (
                    <tr key={r.batch_number} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                          {r.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          {r.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {r.batch_number}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {r.expiry_date}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${r.status === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`}>
                          {r.status} ({r.days_to_expiry}d left)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                        {r.remaining_quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        ${r.purchase_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-rose-600">
                        ${r.loss_risk.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISPOSAL CERTIFICATES AUDIT */}
      {activeReportTab === 'disposals' && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Statutory Waste & Expired Stock De-Registration Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent regulatory destruction certificates and confirmed write-off values
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Ref No.</th>
                  <th className="px-4 py-3">Certificate No.</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3 text-right">Disposed Units</th>
                  <th className="px-4 py-3 text-right">Confirmed Loss</th>
                  <th className="px-4 py-3">Destruction Method</th>
                  <th className="px-4 py-3">Authorized By</th>
                  <th className="px-4 py-3 font-mono">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData?.disposalAudit?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No historical disposal write-offs logged.
                    </td>
                  </tr>
                ) : (
                  reportData?.disposalAudit?.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-semibold text-rose-600">
                        {d.reference_no}
                      </td>
                      <td className="px-4 py-3 font-mono text-teal-600 font-semibold">
                        {d.certificate_no}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {d.product_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {d.batch_number || 'LOT-REF'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        {d.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-rose-600">
                        ${d.total_loss.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {d.disposal_method}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {d.disposed_by_name || 'Staff'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 tabular-nums">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
