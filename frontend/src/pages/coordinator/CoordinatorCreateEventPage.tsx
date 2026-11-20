import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  AlertCircle,
  Save,
  Send,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function CoordinatorCreateEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, venues, approvals, createEvent, updateEventDraft, resubmitEvent } = useManagement();

  const isEditMode = Boolean(id);
  const existingEvent = id ? events.find((e) => e.eventId === Number(id)) : undefined;

  // Check if there are requested changes on this event
  const latestApproval = id
    ? approvals.find((a) => a.eventId === Number(id) && a.status === 'changes_requested')
    : undefined;

  const [formData, setFormData] = useState({
    title: '',
    category: 'Technical',
    shortDescription: '',
    description: '',
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    startDate: '',
    endDate: '',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    venueId: venues[0]?.venueId || 1,
    capacity: 100,
    registrationDeadline: '',
    isWaitlistEnabled: true,
    waitlistCapacity: 25,
    budget: 500,
    rules: 'College ID card required. Please arrive 15 minutes before scheduled start time.',
    equipmentNeeded: 'Projector, 2 Cordless Microphones, Stage podium.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingEvent) {
      setFormData({
        title: existingEvent.title,
        category: existingEvent.category,
        shortDescription: existingEvent.shortDescription || '',
        description: existingEvent.description,
        bannerUrl: existingEvent.bannerUrl,
        startDate: existingEvent.startDate || existingEvent.startTime.split('T')[0] || '',
        endDate: existingEvent.endDate || '',
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime,
        venueId: existingEvent.venueId || existingEvent.venue?.venueId || 1,
        capacity: existingEvent.capacity || existingEvent.maxCapacity || 100,
        registrationDeadline: existingEvent.registrationDeadline || existingEvent.startDate || '',
        isWaitlistEnabled: Boolean(existingEvent.isWaitlistEnabled ?? existingEvent.waitlistEnabled ?? true),
        waitlistCapacity: existingEvent.waitlistCapacity || 25,
        budget: existingEvent.budget || 500,
        rules: typeof existingEvent.rules === 'string' ? existingEvent.rules : Array.isArray(existingEvent.rules) ? existingEvent.rules.join('\n') : '',
        equipmentNeeded: existingEvent.equipmentNeeded || '',
      });
    }
  }, [existingEvent]);

  const selectedVenue = venues.find((v) => v.venueId === Number(formData.venueId)) || venues[0];

  const handleSubmit = async (submitNow: boolean) => {
    setErrorMessage(null);

    // Basic client validation
    if (!formData.title.trim()) {
      setErrorMessage('Please enter an event title.');
      return;
    }
    if (!formData.startDate) {
      setErrorMessage('Please specify an event start date.');
      return;
    }
    if (formData.capacity > selectedVenue.capacity) {
      setErrorMessage(
        `Capacity (${formData.capacity}) exceeds the selected venue's maximum capacity (${selectedVenue.capacity}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        venueId: Number(formData.venueId),
        venueName: selectedVenue.name,
        capacity: Number(formData.capacity),
        waitlistCapacity: Number(formData.waitlistCapacity),
        budget: Number(formData.budget),
        clubId: user?.clubId || 1,
      };

      if (isEditMode && existingEvent) {
        if (existingEvent.status === 'changes_requested') {
          await resubmitEvent(existingEvent.eventId, payload);
        } else {
          await updateEventDraft(existingEvent.eventId, payload, submitNow);
        }
      } else {
        await createEvent(payload, submitNow);
      }

      navigate('/coordinator/events');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Events List', path: '/coordinator/events' },
          { label: isEditMode ? 'Edit Event' : 'Create Event' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditMode ? `Edit Event: ${existingEvent?.title || ''}` : 'Create Campus Event'}
          </h1>
          <p className="text-sm text-slate-500">
            {isEditMode
              ? 'Update event details and resubmit for approval if changes were requested.'
              : 'Fill in event specifications to save a draft or submit directly to your Club Advisor.'}
          </p>
        </div>
      </div>

      {/* Requested Changes Banner if applicable */}
      {latestApproval && latestApproval.requestedChanges && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle size={18} className="text-amber-700" />
            <span>Revision Required by {latestApproval.reviewerRole === 'club_advisor' ? 'Club Advisor' : 'Student Affairs'}</span>
          </div>
          <p className="text-sm text-amber-800 pl-6.5 font-medium">{latestApproval.requestedChanges}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-6">
        {/* 1. Basic Information */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-brand-600" />
            1. Basic Information
          </h2>

          <div className="space-y-4">
            <Input
              label="Event Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Annual Autonomous Robotics Expo"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Social">Social</option>
                  <option value="Orientation">Orientation</option>
                </select>
              </div>

              <Input
                label="Banner Image URL"
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <Input
              label="Short Catchy Tagline / Teaser"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief summary appearing on cards..."
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Full Description & Agenda
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed objectives, itinerary, guest speakers..."
                className="w-full text-sm rounded-xl border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </Card>

        {/* 2. Schedule & Venue Selection */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-brand-600" />
            2. Date, Time & Venue
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="e.g. 10:00 AM"
              />
              <Input
                label="End Time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="e.g. 01:00 PM"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Campus Venue
              </label>
              <select
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: Number(e.target.value) })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {venues.map((v) => (
                  <option key={v.venueId} value={v.venueId}>
                    {v.name} (Max Capacity: {v.capacity} pax | {v.building})
                  </option>
                ))}
              </select>
              <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-600" />
                  {selectedVenue.building}, Floor {selectedVenue.floor}
                </span>
                <span className="font-semibold text-slate-800">
                  Venue Seating Capacity: {selectedVenue.capacity}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Capacity & Waitlist */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand-600" />
            3. Capacity & Registration
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Registration Capacity (Max Seats)"
                type="number"
                min="1"
                max={selectedVenue.capacity}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                required
              />

              <Input
                label="Registration Deadline Date"
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isWaitlistEnabled}
                  onChange={(e) => setFormData({ ...formData, isWaitlistEnabled: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Enable automatic waitlist once registration reaches maximum capacity
                </span>
              </label>

              {formData.isWaitlistEnabled && (
                <div className="mt-3 pl-7 max-w-xs">
                  <Input
                    label="Waitlist Capacity (Max Waitlist Queue)"
                    type="number"
                    min="1"
                    value={formData.waitlistCapacity}
                    onChange={(e) => setFormData({ ...formData, waitlistCapacity: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 4. Budget & Equipment */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-brand-600" />
            4. Budget, Logistics & Guidelines
          </h2>

          <div className="space-y-4">
            <Input
              label="Estimated Budget ($ USD)"
              type="number"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
              placeholder="e.g. 500"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Required Equipment & AV Support
              </label>
              <textarea
                rows={2}
                value={formData.equipmentNeeded}
                onChange={(e) => setFormData({ ...formData, equipmentNeeded: e.target.value })}
                placeholder="Microphones, projector, stage lighting, power strips..."
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Prerequisites & Participant Rules
              </label>
              <textarea
                rows={2}
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="ID requirement, laptop requirement, dress code..."
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm sticky bottom-4">
        <Button variant="outline" onClick={() => navigate('/coordinator/events')}>
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="border border-slate-300"
          >
            <Save size={16} className="mr-2" />
            Save as Draft
          </Button>

          <Button
            variant="primary"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="shadow-sm"
          >
            <Send size={16} className="mr-2" />
            {isEditMode && existingEvent?.status === 'changes_requested'
              ? 'Resubmit Revisions'
              : 'Submit for Approval'}
          </Button>
        </div>
      </div>
    </div>
  );
}
