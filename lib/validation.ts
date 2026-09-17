import { z } from "zod";
import { FOOD_OPTIONS } from "@/lib/food";

const foodValues = FOOD_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

export const registrationFields = z
  .object({
    eventSlug: z.string().trim().min(1, "Ongeldig event."),
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
  })
  .superRefine((value, ctx) => {
    if (value.foodPreference === "andere" && value.extraInfo.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["extraInfo"],
        message:
          "Vul bij Extra info toe wat je bedoelt met ‘Andere’ (allergie of voorkeur).",
      });
    }
  });
