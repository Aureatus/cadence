import { z } from "zod";

const filterSchema = z.enum(["due", "open", "logged", "all"]);
export type FilterKey = z.infer<typeof filterSchema>;
export const DEFAULT_FILTER: FilterKey = "due";

export const dashboardSearchSchema = z.object({
  filter: filterSchema.optional().catch(undefined),
});
