import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from '../contexts/AuthContext';
import { Root } from './components/Root';
import { CallOffForm } from './components/CallOffForm';
import { RentalRequestForm } from './components/RentalRequestForm';
import { OwnedEquipmentForm } from './components/OwnedEquipmentForm';
import { ProjectsManagement } from './components/ProjectsManagement';
import { EquipmentManagement } from './components/EquipmentManagement';
import { UserManagement } from './components/UserManagement';
import { OrganizationManagement } from './components/OrganizationManagement';
import { OrgAdminPanel } from './components/OrgAdminPanel';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/organizations"
              element={
                <ProtectedRoute>
                  <OrganizationManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/org-settings"
              element={
                <ProtectedRoute>
                  <OrgAdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Root />
                </ProtectedRoute>
              }
            >
              <Route index element={<CallOffForm />} />
              <Route path="rental-request" element={<RentalRequestForm />} />
              <Route path="owned-equipment" element={<OwnedEquipmentForm />} />
              <Route path="projects" element={<ProjectsManagement />} />
              <Route path="equipment" element={<EquipmentManagement />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </>
  );
}