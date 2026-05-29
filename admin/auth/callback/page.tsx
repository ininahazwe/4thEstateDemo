"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Result, Spin } from "antd";

// Désactiver le pre-rendering statique pour cette page
export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        // 1) Flow implicite (tokens dans le hash URL)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          // Vérification typée de l'existence de la méthode
          const auth = supabase.auth as {
            getSessionFromUrl?: (options: { storeSession: boolean }) => Promise<{ error: Error | null }>;
          };
          
          if (typeof auth.getSessionFromUrl === "function") {
            const { error } = await auth.getSessionFromUrl({ storeSession: true });
            if (error) throw error;
          } else {
            // Fallback (rare) : parse & set
            const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
            const access_token = h.get("access_token");
            const refresh_token = h.get("refresh_token");
            if (!access_token || !refresh_token) throw new Error("Tokens manquants dans l'URL.");
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
          setState("ok");
          router.replace("/admin");
          return;
        }

        // 2) Flow PKCE (token_hash depuis le template Magic Link)
        const token_hash = params.get("token_hash");
        const type = (params.get("type") ?? "email") as
          "email" | "magiclink" | "recovery" | "invite" | "signup" | "email_change";
        if (token_hash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type });
          if (error) throw error;
          setState("ok");
          router.replace("/admin");
          return;
        }

        throw new Error("Lien invalide ou incomplet.");
      } catch (e: unknown) {
        setState("error");
        setMsg(e instanceof Error ? e.message : "Échec de connexion.");
      }
    })();
  }, [params, router]);

  if (state === "loading") {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Spin /></div>;
  }
  if (state === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <Result status="error" title="Connexion échouée" subTitle={msg} />
      </div>
    );
  }
  return null;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Spin /></div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}