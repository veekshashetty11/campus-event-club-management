import React, { useMemo } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import { BarChart3, Download, MapPin, Boxes } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function VenueReportsPage() {
  const { venues, venueBookings, equipment } = useManagement();

  const venueStats = useMemo(() => {
    return venues.map((v) => {
      const bookingsCount = venueBookings.filter((b) => b.venueId === v.venueId && b.status === 'approved').length;
      return {
        name: v.name.length > 14 ? v.name.substring(0, 12) + '...' : v.name,
        bookings: bookingsCount,
        capacity: v.capacity,
      };
    });
  }, [venues, venueBookings]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Facility Analytics' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Utilization & Equipment Reports</h1>
          <p className="text-sm text-slate-500">
            Booking density, equipment wear tracking, and maintenance records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Approved Bookings per Venue</h2>
          <p className="text-xs text-slate-500 mb-6">Reservation frequency across campus facilities.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={venueStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="bookings" fill="#0d9488" name="Approved Bookings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Equipment Inventory Condition Breakdown */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Equipment Assets Condition</h2>
          <p className="text-xs text-slate-500 mb-4">Hardware lifecycle status for inventory maintenance.</p>
          <div className="space-y-3">
            {equipment.map((eq) => (
              <div key={eq.equipmentId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{eq.name}</p>
                  <p className="text-[11px] text-slate-400">{eq.location} • {eq.category}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">{eq.quantityTotal} Total</span>
                  <span className="block text-[11px] text-teal-700 capitalize font-medium">{eq.condition} Condition</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
