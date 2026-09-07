import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "../components/Layout.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Login from "../pages/Login.jsx";
import Scanner from "../pages/Scanner.jsx";
import ScanLogs from "../pages/ScanLogs.jsx";
import StudentDetails from "../pages/StudentDetails.jsx";
import StudentForm from "../pages/StudentForm.jsx";
import Students from "../pages/Students.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/new" element={<StudentForm />} />
        <Route path="students/:id" element={<StudentDetails />} />
        <Route path="students/:id/edit" element={<StudentForm />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="scans" element={<ScanLogs />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

