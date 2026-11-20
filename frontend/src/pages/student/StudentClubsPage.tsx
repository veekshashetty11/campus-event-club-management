import { useState, useMemo } from 'react';
import { Search, Users, ExternalLink, Plus } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ClubDetailsModal from '../../components/common/ClubDetailsModal';
import type { Club } from '../../types/club';

export default function StudentClubsPage() {
  const { clubs, memberships, events } = useStudent();
  const [activeTab, setActiveTab] = useState<'my_clubs' | 'browse'>('my_clubs');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClubForModal, setSelectedClubForModal] = useState<Club | null>(null);

  // Categories
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(clubs.map((c) => c.category)))];
  }, [clubs]);

  // Browse Clubs Filter
  const filteredBrowseClubs = useMemo(() => {
    return clubs.filter((c) => {
      const matchSearch =
        search === '' ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());

      const matchCategory = selectedCategory === 'All' || c.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [clubs, search, selectedCategory]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto text-slate-100">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'My Clubs & Organizations' }]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Campus Clubs & Societies</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Connect with technical chapters, cultural societies, sports federations, and campus leadership.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'my_clubs' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('my_clubs')}
          >
            My Memberships ({memberships.length})
          </Button>
          <Button
            variant={activeTab === 'browse' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('browse')}
          >
            Discover All Clubs ({clubs.length})
          </Button>
        </div>
      </div>

      {/* ── TAB 1: MY CLUBS ────────────────────────────────────────────── */}
      {activeTab === 'my_clubs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">My Affiliated Clubs</h2>
            <button
              onClick={() => setActiveTab('browse')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Plus size={14} /> Join a New Club
            </button>
          </div>

          {memberships.length === 0 ? (
            <Card className="text-center py-16 text-slate-400">
              <Users size={36} className="mx-auto mb-2 text-slate-500" />
              <p className="text-base font-bold text-white">You haven't joined any clubs yet.</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Explore campus technical chapters, cultural guilds, and athletic bodies to get involved.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('browse')}>
                Browse Clubs Directory
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {memberships.map((mem) => {
                const fullClub = clubs.find((c) => c.clubId === mem.clubId);
                const isApproved = mem.membershipStatus === 'approved';
                const isOfficer = mem.memberRole === 'officer' || mem.memberRole === 'president';

                const clubUpcomingEvents = events.filter(
                  (e) => e.clubId === mem.clubId && e.status === 'published'
                );

                return (
                  <Card
                    key={mem.membershipId}
                    padding="none"
                    className="flex flex-col overflow-hidden hover:border-[#3B82F6]/50 transition-all"
                  >
                    {/* Header Strip */}
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#3B82F6] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                          {mem.clubName.charAt(0)}
                        </div>
                        <Badge
                          variant={isApproved ? (isOfficer ? 'primary' : 'teal') : 'amber'}
                          size="sm"
                          dot
                        >
                          {isApproved
                            ? isOfficer
                              ? 'Club Officer'
                              : 'Active Member'
                            : 'Pending Approval'}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-white text-base leading-snug">{mem.clubName}</h3>
                      <p className="text-xs text-indigo-400 font-semibold">{mem.clubCategory}</p>

                      <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {fullClub?.description || 'Active campus organization engaging students in collaborative activities.'}
                      </p>
                    </div>

                    {/* Stats & Schedule */}
                    <div className="bg-[#17243B] border-t border-[#263650] px-5 py-3 text-xs text-slate-400 space-y-1.5 mt-auto">
                      <div className="flex justify-between">
                        <span>Total Members:</span>
                        <span className="font-semibold text-white">{mem.memberCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upcoming Events:</span>
                        <span className="font-semibold text-indigo-400">{clubUpcomingEvents.length} active</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Member Since:</span>
                        <span className="text-slate-300">{mem.joinedAt}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 border-t border-[#263650] flex justify-end">
                      <Button
                        variant="outline"
                        size="xs"
                        leftIcon={<ExternalLink size={13} />}
                        onClick={() => setSelectedClubForModal(fullClub ?? null)}
                      >
                        View Club Details
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: BROWSE ALL CLUBS ────────────────────────────────────── */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Card padding="sm" className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clubs by name, keywords, or focus area..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#263650] bg-[#17243B] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={[
                      'text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap',
                      selectedCategory === cat
                        ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-[0_0_12px_rgba(79,70,229,0.4)]'
                        : 'bg-[#17243B] text-slate-300 border-[#263650] hover:border-slate-500 hover:text-white',
                    ].join(' ')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Clubs Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBrowseClubs.map((club) => {
              const membership = memberships.find((m) => m.clubId === club.clubId);
              const isJoined = membership && membership.membershipStatus === 'approved';
              const isPending = membership && membership.membershipStatus === 'pending';

              return (
                <Card
                  key={club.clubId}
                  padding="none"
                  className="flex flex-col overflow-hidden hover:border-[#3B82F6]/50 transition-all"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-[#17243B] border border-[#263650] text-cyan-400 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        {club.shortName?.substring(0, 2) || club.name.charAt(0)}
                      </div>
                      <Badge variant="teal" size="sm">
                        {club.category}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-white text-base leading-snug">{club.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{club.departmentName || 'Campus Wide'}</p>

                    <p className="text-xs text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                      {club.description}
                    </p>
                  </div>

                  <div className="bg-[#17243B] border-t border-[#263650] px-5 py-3 text-xs text-slate-400 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Faculty Advisor:</span>
                      <span className="font-semibold text-white">{club.facultyAdvisorName || 'Faculty Lead'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Member Capacity:</span>
                      <span className="font-semibold text-white">{club.memberCount} / {club.maxMembers || 200}</span>
                    </div>
                  </div>

                  <div className="p-3 border-t border-[#263650] flex items-center justify-between gap-2">
                    {isJoined ? (
                      <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-700/50">
                        ✓ Active Member
                      </span>
                    ) : isPending ? (
                      <span className="text-xs font-semibold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-700/50">
                        ⏳ Application Pending
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setSelectedClubForModal(club)}
                      >
                        Request to Join
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setSelectedClubForModal(club)}
                    >
                      View Club
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Club Details Modal */}
      <ClubDetailsModal
        isOpen={!!selectedClubForModal}
        onClose={() => setSelectedClubForModal(null)}
        club={selectedClubForModal}
      />
    </div>
  );
}
