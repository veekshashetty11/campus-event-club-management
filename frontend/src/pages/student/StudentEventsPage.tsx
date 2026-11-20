import { useState, useMemo } from 'react';
import { Search, Calendar, X, ArrowUpDown, Sparkles } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import UpcomingEventCard from '../../components/dashboard/UpcomingEventCard';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function StudentEventsPage() {
  const { events, clubs } = useStudent();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClub, setSelectedClub] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All'); // All, This Week, This Month, Upcoming
  const [selectedStatus, setSelectedStatus] = useState('All'); // All, Open, Filling Fast, Full, Registered, Waitlisted, Completed
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'seats'>('date');

  // Unique categories
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(events.map((e) => e.category)))];
  }, [events]);

  // Filtering & Sorting
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return events
      .filter((ev) => {
        // Keyword Search
        const searchLower = search.toLowerCase();
        const matchSearch =
          search === '' ||
          ev.title.toLowerCase().includes(searchLower) ||
          ev.description.toLowerCase().includes(searchLower) ||
          ev.clubName.toLowerCase().includes(searchLower) ||
          ev.tags?.some((t) => t.toLowerCase().includes(searchLower));

        // Category Filter
        const matchCategory = selectedCategory === 'All' || ev.category === selectedCategory;

        // Club Filter
        const matchClub = selectedClub === 'All' || ev.clubName === selectedClub;

        // Date Filter
        const eventStart = new Date(ev.startTime);
        let matchDate = true;
        if (selectedDateFilter === 'This Week') {
          matchDate = eventStart >= now && eventStart <= oneWeekFromNow;
        } else if (selectedDateFilter === 'This Month') {
          matchDate = eventStart >= now && eventStart <= thirtyDaysFromNow;
        } else if (selectedDateFilter === 'Upcoming') {
          matchDate = eventStart >= now;
        }

        // Status Filter
        const spotsLeft = ev.maxCapacity - ev.registeredCount;
        const isFull = spotsLeft <= 0;
        const filledRatio = ev.registeredCount / ev.maxCapacity;
        const deadlinePassed = now > new Date(ev.registrationDeadline);
        const isCompleted = ev.status === 'completed' || now > new Date(ev.endTime);

        let matchStatus = true;
        if (selectedStatus === 'Registered') {
          matchStatus = ev.isRegistered === true && ev.registrationStatus !== 'waitlisted';
        } else if (selectedStatus === 'Waitlisted') {
          matchStatus = ev.registrationStatus === 'waitlisted';
        } else if (selectedStatus === 'Open') {
          matchStatus = !isCompleted && !deadlinePassed && !isFull && !ev.isRegistered;
        } else if (selectedStatus === 'Filling Fast') {
          matchStatus = !isCompleted && !deadlinePassed && filledRatio >= 0.8 && !isFull;
        } else if (selectedStatus === 'Full') {
          matchStatus = isFull && !isCompleted;
        } else if (selectedStatus === 'Registration Closed') {
          matchStatus = deadlinePassed && !isCompleted;
        } else if (selectedStatus === 'Completed') {
          matchStatus = isCompleted;
        }

        return matchSearch && matchCategory && matchClub && matchDate && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        } else if (sortBy === 'popularity') {
          return b.registeredCount - a.registeredCount;
        } else if (sortBy === 'seats') {
          const seatsA = a.maxCapacity - a.registeredCount;
          const seatsB = b.maxCapacity - b.registeredCount;
          return seatsB - seatsA;
        }
        return 0;
      });
  }, [events, search, selectedCategory, selectedClub, selectedDateFilter, selectedStatus, sortBy]);

  const hasActiveFilters =
    search !== '' ||
    selectedCategory !== 'All' ||
    selectedClub !== 'All' ||
    selectedDateFilter !== 'All' ||
    selectedStatus !== 'All';

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedClub('All');
    setSelectedDateFilter('All');
    setSelectedStatus('All');
    setSortBy('date');
  };

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'Browse Events' }]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campus Events Discovery</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Discover workshops, hackathons, seminars, and sports tournaments across college clubs.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <Sparkles size={14} className="text-brand-600" />
          <span>Showing <strong>{filteredEvents.length}</strong> of {events.length} events</span>
        </div>
      </div>

      {/* Filters Bar Card */}
      <Card padding="md" className="space-y-4">
        {/* Row 1: Search & Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event title, keywords, or topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
              <ArrowUpDown size={14} />
              <span>Sort By:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
            >
              <option value="date">Upcoming Date (Earliest First)</option>
              <option value="popularity">Popularity (Most Registered)</option>
              <option value="seats">Available Seats (Most Remaining)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Club, Date, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Organizing Club</label>
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.clubId} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Date Range</label>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All Dates</option>
              <option value="Upcoming">Upcoming Only</option>
              <option value="This Week">Happening This Week</option>
              <option value="This Month">Happening Next 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Registration Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Registration Open</option>
              <option value="Filling Fast">Filling Fast (≥ 80%)</option>
              <option value="Full">Full (Waitlist Available)</option>
              <option value="Registered">Already Registered</option>
              <option value="Waitlisted">Already Waitlisted</option>
              <option value="Registration Closed">Registration Closed</option>
              <option value="Completed">Completed Past Events</option>
            </select>
          </div>
        </div>

        {/* Row 3: Category Pills & Clear All */}
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={[
                  'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                  selectedCategory === cat
                    ? 'bg-brand-800 text-white border-brand-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-800',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium py-1 px-2 rounded hover:bg-red-50 transition-colors"
            >
              <X size={13} />
              Reset All Filters
            </button>
          )}
        </div>
      </Card>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <Card className="text-center py-16 text-slate-400">
          <Calendar size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No events matched your filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Try adjusting your search query, club filter, or clearing status restrictions.
          </p>
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredEvents.map((event) => (
            <UpcomingEventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
