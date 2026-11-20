import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Boxes,
} from 'lucide-react';

export default function EquipmentBookingsPage() {
  const { equipmentBookings, equipment, decideEquipmentBooking } = useManagement();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleDecision = async (bookingId: number, decision: 'approved' | 'rejected') => {
    setMessage(null);
    try {
      const res = await decideEquipmentBooking(bookingId, decision);
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Action failed',
        isError: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Equipment Bookings' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Equipment Requisitions</h1>
          <p className="text-sm text-slate-500">
            Review club requests for audio systems, projectors, and stage hardware.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !message.isError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {!message.isError ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Event</th>
                <th className="py-3.5 px-4">Club</th>
                <th className="py-3.5 px-4">Equipment Item</th>
                <th className="py-3.5 px-4">Qty Requested</th>
                <th className="py-3.5 px-4">Required Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipmentBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Boxes size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-slate-600">No equipment requests found</p>
                  </td>
                </tr>
              ) : (
                equipmentBookings.map((b) => {
                  const qty = b.quantityRequested || b.quantity || 1;
                  const eqItem = equipment.find((e) => e.equipmentId === b.equipmentId);
                  const isStockAvailable = eqItem ? eqItem.quantityAvailable >= qty : true;

                  return (
                    <tr key={b.bookingId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{b.eventName || b.eventTitle || 'Event'}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{b.clubName}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-teal-800">{b.equipmentName}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-bold text-slate-900">{qty}</span> units
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {new Date(b.bookingDate || b.date || '2026-11-20').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={b.status === 'approved' ? 'success' : b.status === 'pending' ? 'warning' : 'danger'}
                          className="capitalize text-[11px]"
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {b.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleDecision(b.bookingId, 'approved')}
                              disabled={!isStockAvailable}
                              title={!isStockAvailable ? 'Insufficient stock' : 'Approve allocation'}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDecision(b.bookingId, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Decided</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
