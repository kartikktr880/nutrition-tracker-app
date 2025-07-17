"use client";
import { useState } from 'react';

export function useDataPortability() {
  const [exporting, setExporting] = useState(false);
  // ...add any other hook logic from lib/data-portability.ts here...
  // This is a placeholder; actual logic should be copied from the original file.
  return { exporting, setExporting };
} 