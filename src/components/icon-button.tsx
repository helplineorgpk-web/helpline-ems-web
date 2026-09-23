import Link from "next/link";
import { cx } from "@/lib/client";

type IconBtnProps = {
  label: string;
  tone?: "ghost" | "danger" | "primary";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

const toneClass = {
  ghost: "btn-ghost",
  danger: "btn-danger",
  primary: "btn-primary",
};

export function IconButton({
  label,
  tone = "ghost",
  disabled,
  className,
  children,
  ...props
}: IconBtnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      aria-label={label}
      className={cx("btn btn-icon", toneClass[tone], className)}
      disabled={disabled}
      title={label}
      type={props.type || "button"}
    >
      {children}
    </button>
  );
}

export function IconLink({
  label,
  href,
  tone = "ghost",
  className,
  children,
}: IconBtnProps & { href: string }) {
  return (
    <Link aria-label={label} className={cx("btn btn-icon", toneClass[tone], className)} href={href} title={label}>
      {children}
    </Link>
  );
}

export function PlusIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8L17 3.6a2 2 0 0 0-2.8 0L4 13.8V20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m13.2 4.8 5 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M10 7V5h4v2M8 7l.7 12h6.6L16 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 5 5 9-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
