import { useLiveQuery } from "@tanstack/react-db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsCollection, type Settings } from "@/db";
import { updateTheme } from "@/lib/cadence";

const themeLabels: Record<Settings["theme"], string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function SettingsPage() {
  const { data: settings } = useLiveQuery(settingsCollection);
  const current = settings.find((entry) => entry.id === "settings") ?? {
    id: "settings",
    theme: "system" as const,
  };

  return (
    <Card className="mt-7 max-w-2xl border border-rule bg-[oklch(20%_0.03_220/0.22)] gap-5 rounded-3xl px-5 py-6 ring-0 backdrop-blur-md md:px-7 md:py-7">
      <CardHeader className="px-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-foam opacity-65">
          settings collection
        </p>
        <h1 className="mt-2 font-display text-[clamp(32px,4.5vw,52px)] font-normal italic leading-[0.92] text-moon-2 normal-case tracking-[-0.012em]">
          Local <em className="text-sand-2">preferences</em>.
        </h1>
      </CardHeader>
      <CardContent className="grid gap-5 px-0">
        <div className="grid gap-2">
          <Label htmlFor="theme-select" className="text-xs uppercase tracking-[0.16em] text-foam">
            Theme
          </Label>
          <Select
            value={current.theme}
            onValueChange={(value) => updateTheme(settings, value as Settings["theme"])}
          >
            <SelectTrigger
              id="theme-select"
              className="h-11 w-full max-w-xs rounded-none border-0 border-b border-rule-2 bg-transparent px-0 text-base text-moon-2 focus-visible:border-b-coral md:text-sm"
            >
              <SelectValue>{(value: Settings["theme"]) => themeLabels[value]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(themeLabels) as Array<Settings["theme"]>).map((value) => (
                <SelectItem key={value} value={value}>
                  {themeLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm leading-relaxed text-foam opacity-75">
          All app data is stored in localStorage under the{" "}
          <code className="font-mono text-foam-2">cadence.*</code> keys.
        </p>
      </CardContent>
    </Card>
  );
}
