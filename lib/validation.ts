import { z } from "zod";
import { FOOD_OPTIONS } from "@/lib/food";

const foodValues = FOOD_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

export const registrationFields = z.object({
  name: z.string().trim().min(2, "Vul je naam in.").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Vul een geldig e-mailadres in."),
  phone: z
    .string()
    .trim()
    .min(8, "Vul een geldig telefoonnummer in.")
    .max(40),
  extraInfo: z.string().trim().max(2000, "Extra info is te lang.").default(""),
  foodPreference: z
    .string()
    .refine((value) => foodValues.includes(value), "Kies een voedselvoorkeur."),
});
