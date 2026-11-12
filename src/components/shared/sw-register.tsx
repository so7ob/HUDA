"use client";

import { useEffect } from "react";

/**
 * تسجيل Service Worker للعمل دون اتصال (Issue #8).
 * لا يسجل إلا في الإنتاج أو عند تفعيل صريح — للتطوير نستخدم ?sw=1 لتجربته محليًا
 * حتى لا يتداخل مع HMR في التطوير العادي.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const enable =
      process.env.NODE_ENV === "production" || new URLSearchParams(window.location.search).get("sw") === "1";
    if (!enable) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
        console.warn("SW registration failed", e);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
