interface PublicCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function PublicCheckbox({
  checked,
  onChange,
  disabled = false,
}: PublicCheckboxProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        Projekt
      </label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mr-2"
      />
      <span>Publiczny</span>
    </div>
  );
}
