"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/client";

export type DropdownOption = { value: string; label: string };

export function Dropdown({
  value,
  onChange,
  options,
  className,
  disabled,
  placeholder = "Select",
  ariaLabel,
  onOpen,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  onOpen?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value);

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 320;
    const gap = 8;
    const width = Math.max(rect.width, 260);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setMenuStyle({
      top: openUp ? Math.max(8, rect.top - gap - Math.min(menuHeight, rect.top - 8)) : rect.bottom + gap,
      left,
      width,
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        className="select cursor-pointer text-left font-[inherit] disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={async () => {
          if (disabled) return;
          if (!open) await onOpen?.();
          place();
          setOpen((value) => !value);
        }}
      >
        <span className="block truncate">{current?.label || placeholder}</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
              className="soft-pop fixed z-50 max-h-80 overflow-auto rounded-2xl border border-line bg-paper p-1.5 shadow-[0_18px_40px_rgba(22,61,40,0.14)]"
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cx(
                      "flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm leading-snug break-words transition",
                      selected ? "bg-leaf-soft font-semibold text-leaf-dark" : "text-ink hover:bg-canvas"
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
