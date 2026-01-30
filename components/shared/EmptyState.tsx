/**
 * EmptyState Component
 *
 * A reusable empty state component with icon, title, description, and CTA.
 * Used when there's no data to display in a list or grid.
 *
 * Features:
 * - Customizable icon (default: generic empty icon)
 * - Title and description text
 * - Optional call-to-action button or link
 * - Consistent styling across the application
 */

import Link from "next/link";
import type { ReactNode } from "react";

// Predefined icons for common empty states
export type EmptyStateIconType =
  | "brands"
  | "products"
  | "personas"
  | "creatives"
  | "audiences"
  | "reports"
  | "generic";

// Props for the EmptyState component
interface EmptyStateProps {
  /**
   * Icon type to display, or a custom ReactNode
   */
  icon?: EmptyStateIconType | ReactNode;

  /**
   * Main title text
   */
  title: string;

  /**
   * Description text below the title
   */
  description: string;

  /**
   * CTA button/link configuration
   */
  action?: {
    /**
     * Label for the CTA button
     */
    label: string;

    /**
     * URL to navigate to (renders as Link) or onClick handler (renders as button)
     */
    href?: string;

    /**
     * Click handler (if no href provided)
     */
    onClick?: () => void;

    /**
     * Icon to show before the label
     */
    icon?: ReactNode;

    /**
     * Button variant
     */
    variant?: "primary" | "secondary";
  };

  /**
   * Additional actions (for multiple CTAs)
   */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
    variant?: "primary" | "secondary";
  };

  /**
   * Custom class name for additional styling
   */
  className?: string;
}

// Icon components for different empty states
function BrandsIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function PersonasIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CreativesIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function AudiencesIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function GenericIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// Plus icon for CTAs
function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// Get icon component based on type
function getIconComponent(iconType: EmptyStateIconType): ReactNode {
  switch (iconType) {
    case "brands":
      return <BrandsIcon />;
    case "products":
      return <ProductsIcon />;
    case "personas":
      return <PersonasIcon />;
    case "creatives":
      return <CreativesIcon />;
    case "audiences":
      return <AudiencesIcon />;
    case "reports":
      return <ReportsIcon />;
    case "generic":
    default:
      return <GenericIcon />;
  }
}

// Action button component
function ActionButton({
  label,
  href,
  onClick,
  icon,
  variant = "primary",
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const buttonClasses = `empty-state-cta ${variant}`;

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {icon || <PlusIcon />}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={buttonClasses} onClick={onClick}>
      {icon || <PlusIcon />}
      {label}
    </button>
  );
}

export default function EmptyState({
  icon = "generic",
  title,
  description,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  // Determine if icon is a predefined type or custom ReactNode
  const iconContent =
    typeof icon === "string" ? getIconComponent(icon as EmptyStateIconType) : icon;

  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="empty-state-icon">{iconContent}</div>
      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-description">{description}</p>

      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <ActionButton
              label={action.label}
              href={action.href}
              onClick={action.onClick}
              icon={action.icon}
              variant={action.variant || "primary"}
            />
          )}
          {secondaryAction && (
            <ActionButton
              label={secondaryAction.label}
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
              icon={secondaryAction.icon}
              variant={secondaryAction.variant || "secondary"}
            />
          )}
        </div>
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          background: var(--color-surface);
          border: 1px dashed rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          text-align: center;
          position: relative;
        }
        .empty-state::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.03) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 16px;
        }

        .empty-state-icon {
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
          filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.2));
        }

        .empty-state-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .empty-state-description {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.75rem;
          max-width: 400px;
          line-height: 1.6;
        }

        .empty-state-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .empty-state-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .empty-state-cta.primary {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
        }
        .empty-state-cta.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.35), 0 8px 25px -8px rgba(139, 92, 246, 0.4);
        }

        .empty-state-cta.secondary {
          background: transparent;
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.4);
        }
        .empty-state-cta.secondary:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
          transform: translateY(-1px);
        }

        @media (max-width: 480px) {
          .empty-state {
            padding: 3rem 1.5rem;
          }
          .empty-state-actions {
            flex-direction: column;
            width: 100%;
          }
          .empty-state-cta {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// Export the PlusIcon for use in other components
export { PlusIcon };
