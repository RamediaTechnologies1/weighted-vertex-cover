"use client";

import { useEffect, useCallback, useRef } from "react";

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    permissionRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    }
  }, []);

  const notify = useCallback((title: string, body: string, onClick?: () => void) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (permissionRef.current !== "granted") return;

    const notification = new Notification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "fixit-notification",
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  }, []);

  return { notify };
}
