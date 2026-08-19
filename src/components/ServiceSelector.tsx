import { Button } from "@/components/ui/button";
import type { ServiceOption, ServiceType } from "@/lib/types";

type ServiceSelectorProps = {
  disabled?: boolean;
  onChange: (services: ServiceType[]) => void;
  options: ServiceOption[];
  value: ServiceType[];
};

export const ServiceSelector = ({
  disabled,
  onChange,
  options,
  value,
}: ServiceSelectorProps) => (
  <div className="overflow-hidden rounded-md border bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
      <p className="text-sm font-medium">Servicios habilitados</p>
      <div className="flex gap-2">
        <Button
          disabled={disabled}
          onClick={() => onChange(options.map((option) => option.key))}
          size="sm"
          type="button"
          variant="outline"
        >
          Seleccionar todos
        </Button>
        <Button
          disabled={disabled}
          onClick={() => onChange([])}
          size="sm"
          type="button"
          variant="outline"
        >
          Limpiar
        </Button>
      </div>
    </div>
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          className="flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium"
          key={option.key}
        >
          <input
            checked={value.includes(option.key)}
            disabled={disabled}
            onChange={(event) =>
              onChange(event.target.checked
                ? [...value, option.key]
                : value.filter((service) => service !== option.key))
            }
            type="checkbox"
          />
          {option.label}
        </label>
      ))}
    </div>
  </div>
);
