import type { Field } from "@/components/form-dialog";
import { EQ_CATEGORIES, EQ_STATUS, LEVELS } from "@/lib/options";

export const EQ_FIELDS: Field[] = [
  { name: "code", label: "Equipment code", required: true }, { name: "name", label: "Machine name", required: true },
  { name: "category", label: "Category", type: "select", options: EQ_CATEGORIES, required: true }, { name: "status", label: "Status", type: "select", options: EQ_STATUS, required: true },
  { name: "manufacturer", label: "Manufacturer" }, { name: "brand", label: "Brand" }, { name: "model", label: "Model" }, { name: "serial_number", label: "Serial number" },
  { name: "year_manufactured", label: "Year of manufacture", type: "number" }, { name: "commissioning_date", label: "Commissioning date", type: "date" },
  { name: "location", label: "Location" }, { name: "workshop", label: "Workshop" }, { name: "department", label: "Department" },
  { name: "criticality", label: "Criticality", type: "select", options: LEVELS, required: true }, { name: "responsible_operator", label: "Responsible operator" },
  { name: "operating_hours", label: "Operating hours", type: "number" }, { name: "image_url", label: "Image URL", full: true },
  { name: "specifications", label: "Technical specifications", type: "textarea" },
];
