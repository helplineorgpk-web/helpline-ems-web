import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ProjectTypesProvider } from "@/components/project-types";
import { NotificationsProvider } from "@/components/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  return (
    <ProjectTypesProvider>
      <NotificationsProvider>
        <div className="min-h-screen lg:flex">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header admin={session} />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </div>
        </div>
      </NotificationsProvider>
    </ProjectTypesProvider>
  );
}
