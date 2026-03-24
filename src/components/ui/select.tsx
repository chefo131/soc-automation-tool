// Simplified select for ZIP bundle
import * as React from "react";
import { cn } from "@/lib/utils";

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm")} {...props}>{children}</select>
);
export { Select };