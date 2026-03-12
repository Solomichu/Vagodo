import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function Card({ children, className = "", onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-paper border border-ink-15 rounded-[2rem] p-5 card-enter ${
        onClick ? "cursor-pointer lift" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
