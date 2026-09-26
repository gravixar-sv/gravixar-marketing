"use client";

// Reads how the visit arrived (a ?src tag, or the site that sent it) on the
// first page, before any in-site navigation can drop the query string. It
// renders nothing and writes nothing to the device; see src/lib/source-tag.ts.

import { useEffect } from "react";
import { rememberVisitSource } from "@/lib/source-tag";

export function SourceCapture() {
  useEffect(() => {
    rememberVisitSource();
  }, []);
  return null;
}
