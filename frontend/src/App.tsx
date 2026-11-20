import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ManagementProvider } from './contexts/ManagementContext';
import { StudentProvider } from './contexts/StudentContext';
import { router } from './routes/router';

export default function App() {
  return (
    <AuthProvider>
      <ManagementProvider>
        <StudentProvider>
          <RouterProvider router={router} />
        </StudentProvider>
      </ManagementProvider>
    </AuthProvider>
  );
}
