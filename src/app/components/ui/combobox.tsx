import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./utils";

interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

export const Combobox = React.forwardRef<HTMLDivElement, ComboboxProps>(
  ({ value, onValueChange, options, placeholder = "Select...", emptyMessage = "No results found.", className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = React.useMemo(() => {
      if (!search) return options;
      return options.filter((option) =>
        option.toLowerCase().includes(search.toLowerCase())
      );
    }, [options, search]);

    const selectedOption = options.find((option) => option === value);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false);
          setSearch("");
        }
      };

      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [open]);

    const handleSelect = (option: string) => {
      onValueChange?.(option);
      setOpen(false);
      setSearch("");
    };

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-[color,box-shadow]"
          )}
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>
            {selectedOption || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
                  "placeholder:text-muted-foreground"
                )}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "transition-colors",
                      value === option && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{option}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Combobox.displayName = "Combobox";
