import { AdminLoginForm } from "@/components/admin/admin-login-form";

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/admin") ? next : "/admin";
  return <AdminLoginForm nextPath={nextPath} />;
}
