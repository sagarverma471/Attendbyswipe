import React, { ReactNode } from 'react';

interface ResponsiveTableWrapperProps {
  /** Vertical list of data-rich touch-friendly cards rendered on screens smaller than 768px */
  mobileCards: ReactNode;
  /** Full table component with column headers rendered on screens 768px and wider */
  desktopTable: ReactNode;
  className?: string;
  tableContainerClassName?: string;
}

/**
 * ResponsiveTableWrapper
 *
 * Enforces responsive media queries:
 * - Screens < 768px: Completely hides the horizontal table to eliminate layout overflow,
 *   rendering a rich, vertical list of touch-friendly cards maintaining identical functionality.
 * - Screens >= 768px: Renders the structured desktop table inside a contained horizontal-scroll container.
 */
export const ResponsiveTableWrapper: React.FC<ResponsiveTableWrapperProps> = ({
  mobileCards,
  desktopTable,
  className = '',
  tableContainerClassName = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Card List (Hidden on screens >= 768px) */}
      <div className="block md:hidden w-full responsive-card-view">
        {mobileCards}
      </div>

      {/* Desktop / Tablet Table View (Hidden on screens < 768px) */}
      <div className={`hidden md:block w-full overflow-x-auto responsive-table-view rounded-2xl border border-white/10 bg-[#101526] shadow-xl transition-all duration-200 ${tableContainerClassName}`}>
        {desktopTable}
      </div>
    </div>
  );
};

export default ResponsiveTableWrapper;
