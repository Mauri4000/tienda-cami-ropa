import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './admin/contexts/AuthContext';
import ProtectedRoute from './admin/components/ProtectedRoute';
import AdminLayout from './admin/components/AdminLayout';
import LoginPage from './admin/pages/LoginPage';
import DashboardPage from './admin/pages/DashboardPage';
import VentasPage from './admin/pages/VentasPage';
import CatalogoPage from './admin/pages/CatalogoPage';
import ClientesPage from './admin/pages/ClientesPage';

function AdminApp() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="ventas"   element={<VentasPage />} />
        <Route path="catalogo" element={<CatalogoPage />} />
        <Route path="clientes" element={<ClientesPage />} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AdminApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
