/**
 * Shared 2x2 dot-grid icon and dropdown-item class for the row action menus used
 * across the agency tables (reminders, staff tasks, billing, mileage). Several
 * billing/mileage components still inline their own copies — migrate them here too.
 */
export function DotGridIcon() {
  return (
    <span className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} className="h-[4px] w-[4px] rounded-full bg-[#808081]" />
      ))}
    </span>
  );
}

export const menuItemClassName =
  "cursor-pointer rounded-none px-4 py-2.5 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] focus:bg-[#eef4f5]";
