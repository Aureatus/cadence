import * as v from "valibot";

const filterSchema = v.picklist(["due", "open", "logged", "all"]);
export type FilterKey = v.InferOutput<typeof filterSchema>;
export const DEFAULT_FILTER: FilterKey = "due";

export const dashboardSearchSchema = v.object({
  filter: v.fallback(v.optional(filterSchema), undefined),
});
