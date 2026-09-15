import type { ReactNode } from "react";
import {
  ClarityBlock,
  type ClarityEmphasis,
} from "@/components/clarity-block";

type SectionProps = {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  /** Visual weight for glance hierarchy. */
  emphasis?: ClarityEmphasis;
};

export function Section({
  title,
  children,
  aside,
  className,
  emphasis = "secondary",
}: SectionProps) {
  return (
    <ClarityBlock
      title={title}
      aside={aside}
      className={className}
      emphasis={emphasis}
    >
      {children}
    </ClarityBlock>
  );
}
