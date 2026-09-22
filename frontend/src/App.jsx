import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BookingPage from './pages/customer/BookingPage';
import MyReservationsPage from './pages/customer/MyReservationsPage';
import PaymentPage from './pages/customer/PaymentPage';
import FloorPlanPage from './pages/staff/FloorPlanPage';
import HostPage from './pages/staff/HostPage';
import FinancePage from './pages/staff/FinancePage';
import StockPage from './pages/staff/StockPage';
import DashboardPage from './pages/manager/DashboardPage';
import MenuManagePage from './pages/manager/MenuManagePage';
import ApprovalPage from './pages/owner/ApprovalPage';

const STAFF = ['STAFF_HOST','STAFF_FINANCE','STAFF_STOCK','MANAGER','OWNER'];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/403" element={
            <main className="min-h-screen grid place-items-center text-center px-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">403 — ไม่มีสิทธิ์เข้าถึง</h1>
                <p className="text-gray-500">บัญชีของคุณไม่ได้รับอนุญาตให้เข้าหน้านี้</p>
              </div>
            </main>} />

          <Route element={<Layout />}>
            <Route index element={<Navigate to="/booking" replace />} />
            <Route path="/booking" element={
              <ProtectedRoute><BookingPage /></ProtectedRoute>} />
            <Route path="/my-reservations" element={
              <ProtectedRoute><MyReservationsPage /></ProtectedRoute>} />
            <Route path="/payment/:id" element={
              <ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/staff/floor-plan" element={
              <ProtectedRoute roles={STAFF}><FloorPlanPage /></ProtectedRoute>} />
            <Route path="/staff/host" element={
              <ProtectedRoute roles={['STAFF_HOST','MANAGER','OWNER']}><HostPage /></ProtectedRoute>} />
            <Route path="/staff/finance" element={
              <ProtectedRoute roles={['STAFF_FINANCE','MANAGER','OWNER']}><FinancePage /></ProtectedRoute>} />
            <Route path="/staff/stock" element={
              <ProtectedRoute roles={['STAFF_STOCK','MANAGER','OWNER']}><StockPage /></ProtectedRoute>} />
            <Route path="/manager/dashboard" element={
              <ProtectedRoute roles={['MANAGER','OWNER']}><DashboardPage /></ProtectedRoute>} />
            <Route path="/manager/menu" element={
              <ProtectedRoute roles={['MANAGER','OWNER']}><MenuManagePage /></ProtectedRoute>} />
            <Route path="/owner/approval" element={
              <ProtectedRoute roles={['OWNER']}><ApprovalPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
