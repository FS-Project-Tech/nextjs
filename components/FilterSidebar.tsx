type FilterSidebarProps = {
  isMobileDrawer?: boolean;
  onClose?: () => void;
};

export default function FilterSidebar({
  isMobileDrawer = false,
  onClose,
}: FilterSidebarProps) {
  return (
    <div>
      {/* Example usage */}
      {isMobileDrawer && (
        <button onClick={onClose} className="mb-4">
          Close
        </button>
      )}

      {/* Your filters here */}
      <div>Filters...</div>
    </div>
  );
}