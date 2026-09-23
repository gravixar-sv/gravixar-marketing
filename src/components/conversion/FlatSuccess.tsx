import type { ReactNode } from "react";
import { FormSuccess } from "@/components/ui/Field";

// The careers apply panel is already a lit panel, so its confirmation is the
// flat variant of the shared FormSuccess (a lit panel inside a lit panel is a
// card in a card).
export function FlatSuccess({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <FormSuccess title={title} flat>
      {children}
    </FormSuccess>
  );
}
