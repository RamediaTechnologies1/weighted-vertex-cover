"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

type RealtimeCallback = () => void;

export function useRealtimeTable(table: string, callback: RealtimeCallback) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
}
