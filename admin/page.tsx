"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function AdminIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/countries"); }, [router]);
  return null;
}
