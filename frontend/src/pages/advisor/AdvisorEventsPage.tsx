import PlaceholderPage from '../PlaceholderPage';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import { Calendar } from 'lucide-react';
export default function AdvisorEventsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Advisor', path: '/advisor/dashboard' }, { label: 'Events for Review' }]} />
      <PlaceholderPage title="Events for Review" icon={<Calendar size={28} className="text-teal-500" />} />
    </div>
  );
}
