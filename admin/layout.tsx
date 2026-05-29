"use client";
import React, { Suspense } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import { usePathname, useRouter } from "next/navigation";
import { 
  RefineThemes, 
  ThemedLayout as ThemedLayoutV2, 
  useNotificationProvider,
} from "@refinedev/antd";
import { ConfigProvider, Layout as AntdLayout, App, Spin } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@refinedev/antd/dist/reset.css";
import "@ant-design/v5-patch-for-react-19";
import routerBindings from "@refinedev/nextjs-router";
import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import { supabase } from "@/lib/supabase";
import { authProvider } from "@/lib/refine/authProvider";
import AppSider from "@/app/admin/layout/AppSider";
import AppHeader from "@/app/admin/layout/AppHeader";

export const dynamic = 'force-dynamic';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Routes qui ne nécessitent pas d'authentification
  const isAuthRoute = pathname?.startsWith("/admin/auth") || 
                      pathname?.startsWith("/admin/login") ||
                      pathname?.startsWith("/admin/forgot-password") ||
                      pathname?.startsWith("/admin/reset-password");

  if (isAuthRoute) {
    return children;
  }

  // Composant de redirection pour les utilisateurs non authentifiés
  const RedirectToLogin = () => {
    React.useEffect(() => {
      router.push("/admin/login");
    }, []);
    
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  };

  return (
    <ConfigProvider theme={RefineThemes.Blue}>
      <Refine
        dataProvider={supabaseDataProvider(supabase)}
        routerProvider={routerBindings}
        notificationProvider={useNotificationProvider}
        authProvider={authProvider}
        resources={[
          { 
            name: "countries", 
            list: "/admin/countries", 
            create: "/admin/countries/create", 
            edit: "/admin/countries/edit/:id" 
          },
          { 
            name: "media_environment", 
            list: "/admin/country-media", 
            create: "/admin/country-media/create", 
            edit: "/admin/country-media/edit/:id" 
          },
        ]}
        options={{ 
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Authenticated
          key="authenticated-inner"
          fallback={<RedirectToLogin />}
        >
          <App>
            <ThemedLayoutV2 
              Sider={() => <AppSider />} 
              Header={() => <AppHeader />}
            >
              <AntdLayout.Content style={{ padding: 24 }}>
                {children}
              </AntdLayout.Content>
            </ThemedLayoutV2>
          </App>
        </Authenticated>
      </Refine>
    </ConfigProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <Spin size="large" />
        </div>
      }>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </Suspense>
    </QueryClientProvider>
  );
}