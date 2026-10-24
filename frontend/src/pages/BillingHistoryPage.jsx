import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import InvoiceModal from '../components/InvoiceModal';
import { 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  FileText, 
  RefreshCw, 
  Zap, 
  AlertCircle 
} from 'lucide-react';

export default function BillingHistoryPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await api.getMyBills();
      if (res.success) {
        setBills(res.bills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleOpenInvoice = async (billId) => {
    try {
      const res = await api.getBillById(billId);
      if (res.success) {
        setSelectedInvoice(res.invoice);
      }
    } catch (err) {
      alert(err.message || 'Failed to fetch invoice details.');
    }
  };

  return (
    <div className="space-y-6 py-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            Billing & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Energy billing statements, applied electricity tariffs, and payment transactions.
          </p>
        </div>

        <button
          onClick={fetchBills}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Invoices
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Station & Port Dispenser</th>
                <th className="py-3 px-4">Energy Consumed</th>
                <th className="py-3 px-4">Total Amount (₹)</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Querying bills table...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No billing records generated yet. Complete a charging session to generate an invoice.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {b.invoice_number}
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-800 block">{b.station_name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {b.charger_code} ➔ {b.port_code} ({b.connector_type})
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <span className="font-bold text-emerald-700 text-sm">{b.energy_consumed_kwh} kWh</span>
                      <span className="block text-[10px] text-slate-400">
                        @ ₹{b.tariff_rate_per_kwh}/kWh
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                      ₹{b.total_amount}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        b.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {b.payment_status === 'PAID' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-600" />
                        )}
                        {b.payment_status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenInvoice(b.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Tax Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaymentComplete={() => {
            fetchBills();
            handleOpenInvoice(selectedInvoice.id);
          }}
        />
      )}

    </div>
  );
}
