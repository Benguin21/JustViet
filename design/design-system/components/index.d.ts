import * as React from 'react';

/**
 * Badge
 */
export interface BadgeProps {
  tone?: "gray" | "yellow" | "red" | "green" | "blue";
  children: React.ReactNode;
}

export declare const Badge: React.ComponentType<BadgeProps>;

/**
 * Button
 * @replaces button
 */
export interface ButtonProps {
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "md" | "sm";
  loading?: boolean;
  fullWidth?: boolean;
}

export declare const Button: React.ComponentType<ButtonProps>;

/**
 * ConfirmDialog
 */
export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export declare const ConfirmDialog: React.ComponentType<ConfirmDialogProps>;

/**
 * Logo
 */
export interface LogoProps {
  className?: string;
}

export declare const Logo: React.ComponentType<LogoProps>;

/**
 * Modal
 * @replaces dialog
 */
export interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl" | "2xl";
}

export declare const Modal: React.ComponentType<ModalProps>;

/**
 * NavCard
 */
export interface NavCardProps {
  href: string;
  icon: string;
  label: string;
  description: string;
  tone: "yellow" | "red";
}

export declare const NavCard: React.ComponentType<NavCardProps>;

/**
 * Select
 * @replaces select
 */
export interface SelectProps {
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Omit when the field is already labeled by a wrapping component. */
  label?: string;
  error?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Select: React.ComponentType<SelectProps>;

/**
 * Switch
 */
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export declare const Switch: React.ComponentType<SwitchProps>;

/**
 * TagInput
 */
export interface TagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export declare const TagInput: React.ComponentType<TagInputProps>;

/**
 * TextField
 * @replaces input
 */
export interface TextFieldProps {
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Omit when the field is already labeled by a wrapping component. */
  label?: string;
  error?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const TextField: React.ComponentType<TextFieldProps>;

/**
 * Textarea
 * @replaces textarea
 */
export interface TextareaProps {
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  label: string;
  error?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Textarea: React.ComponentType<TextareaProps>;

/**
 * Toast
 */
export interface ToastProps {
  message: string;
}

export declare const Toast: React.ComponentType<ToastProps>;

/**
 * Tooltip
 */
export interface TooltipProps {
  text: string;
}

export declare const Tooltip: React.ComponentType<TooltipProps>;

/**
 * RatingButtons
 */
export interface RatingButtonsProps {
/** Interval preview per rating, e.g. { again: { rating: "again", dueAt, scheduledDays: 0, label: "10 min" }, ... }. */
  previews: Record<"again" | "hard" | "good" | "easy", { rating: "again" | "hard" | "good" | "easy"; dueAt: number; scheduledDays: number; label: string }>;
  onRate: (rating: "again" | "hard" | "good" | "easy") => void;
  disabled?: boolean;
}

export declare const RatingButtons: React.ComponentType<RatingButtonsProps>;

/**
 * StatusBadge
 */
export interface StatusBadgeProps {
  status: "new" | "learning" | "review" | "relearning" | "suspended";
}

export declare const StatusBadge: React.ComponentType<StatusBadgeProps>;

