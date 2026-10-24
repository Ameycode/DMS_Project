import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Zap, 
  QrCode, 
  ShieldCheck,
  Building,
  User,
  AlertCircle
} from 'lucide-react';

export default function InvoiceModal({ invoice, onClose, onPaymentComplete }) {
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState(null);

  const isPaid = invoice.payment_status === 'PAID' || paymentSuccess;

  const handlePay = async () => {
    setError(null);
    setPaying(true);
    try {
      const res = await api.payBill(invoice.id, paymentMethod);
      if (res.success) {
        setPaymentSuccess(true);
        if (onPaymentComplete) onPaymentComplete(res.payment);
      }
    } catch (err) {
      setError(err.message || 'Payment simulation failed.');
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Tax Invoice & Energy Bill</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-invoice" className="p-8 space-y-6 text-slate-800 bg-white">
          
          {/* Header Row */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-2xl tracking-tight">
                <Zap className="w-7 h-7 fill-emerald-600" />
                VoltSlot EV Network
              </div>
              <p className="text-xs text-slate-500 mt-1">Smart EV Infrastructure & Billing Management</p>
              <p className="text-[11px] text-slate-400 font-mono">GSTIN: 29AABCV1234F1Z9 • CIN: U72900KA2026PTC10998</p>
            </div>

            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase mb-1 ${
                isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isPaid ? 'PAID / SETTLED' : 'PAYMENT PENDING'}
              </span>
              <h2 className="text-sm font-mono font-bold text-slate-900 block">{invoice.invoice_number}</h2>
              <span className="text-xs text-slate-500 block">
                Date: {new Date(invoice.created_at || invoice.bill_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Customer & Station Information Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Customer Details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                Billed To (EV Owner):
              </span>
              <p className="font-bold text-sm text-slate-900">{invoice.customer_name || 'Registered Driver'}</p>
              <p className="text-slate-600">{invoice.customer_email}</p>
              <p className="text-slate-600">Phone: {invoice.customer_phone || 'N/A'}</p>
              {invoice.ev_model && (
                <p className="text-emerald-700 font-medium">Vehicle: {invoice.ev_model}</p>
              )}
            </div>

            {/* Station & Dispenser Details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                Dispensing Station Details:
              </span>
              <p className="font-bold text-sm text-slate-900">{invoice.station_name}</p>
              <p className="text-slate-600">{invoice.station_address}, {invoice.station_city}</p>
              <div className="pt-1 mt-1 border-t border-slate-200 font-mono text-[11px] text-slate-700">
                <span>Charger: <strong>{invoice.charger_code}</strong> ({invoice.charger_label})</span>
                <span className="block text-emerald-800 font-bold">Port: {invoice.port_code} ({invoice.connector_type})</span>
              </div>
            </div>
          </div>

          {/* Metering & Energy Consumption Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 font-semibold text-xs text-slate-700 flex justify-between">
              <span>Metering Particulars</span>
              <span className="font-mono">Reference: {invoice.booking_reference}</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Initial Meter (Start)</span>
                <span className="font-bold text-slate-900 text-sm">{invoice.meter_start_kwh || '0.00'} kWh</span>
              </div>
              <div>
                <span className="text-slate-500 block">Final Meter (End)</span>
                <span className="font-bold text-slate-900 text-sm">{invoice.meter_end_kwh || '0.00'} kWh</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 block font-semibold text-[10px] uppercase">Net Energy Delivered</span>
                <span className="font-bold text-emerald-700 text-base">{invoice.energy_consumed_kwh} kWh</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="text-left py-2">Item Description</th>
                <th className="text-center py-2">Rate / Unit</th>
                <th className="text-right py-2">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-2.5 text-slate-800">
                  <span className="font-bold block">Electricity Consumption Charge</span>
                  <span className="text-slate-400 font-sans text-[11px]">
                    {invoice.energy_consumed_kwh} kWh @ ₹{invoice.tariff_rate_per_kwh}/kWh
                  </span>
                </td>
                <td className="text-center py-2.5 text-slate-600">₹{invoice.tariff_rate_per_kwh}</td>
                <td className="text-right py-2.5 font-bold text-slate-900">₹{invoice.energy_charge}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-800">Station Grid Connection & Service Fee</td>
                <td className="text-center py-2 text-slate-600">Fixed</td>
                <td className="text-right py-2 text-slate-900">₹{invoice.service_fee}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-800">Goods and Services Tax (GST @ 18%)</td>
                <td className="text-center py-2 text-slate-600">18.00%</td>
                <td className="text-right py-2 text-slate-900">₹{invoice.tax_amount}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-mono">
                <th colSpan="2" className="text-left py-3 text-sm font-bold text-slate-900">Total Billed Amount (INR):</th>
                <th className="text-right py-3 text-lg font-bold text-emerald-700">₹{invoice.total_amount}</th>
              </tr>
            </tfoot>
          </table>

          {/* Payment Status or Simulation Section */}
          <div className="pt-2 border-t border-slate-200">
            {isPaid ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-emerald-900 block">Payment Settled</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Ref: {invoice.payment_reference || 'PAY-SIMULATED-ONLINE'} • Method: {invoice.payment_method || 'UPI'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-emerald-700 font-bold">₹{invoice.total_amount}</span>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 print:hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Simulate Invoice Settlement:</span>
                  <span className="text-xs text-amber-700 font-medium">Pending ₹{invoice.total_amount}</span>
                </div>

                {error && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium bg-white"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="WALLET">EV Fleet Wallet</option>
                  </select>

                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {paying ? 'Processing Simulation...' : `Pay ₹${invoice.total_amount} Now`}
                    <CreditCard className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Generated electronically by VoltSlot Relational DBMS Engine</span>
            <span>ACID Verified • Double-Booking Guarded</span>
          </div>

        </div>

      </div>
    </div>
  );
}
