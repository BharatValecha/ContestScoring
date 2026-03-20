import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
