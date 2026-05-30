import {
  Camera,
  Clapperboard,
  Globe,
  LayoutTemplate,
  Palette,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import type { ProjectType } from "@/lib/project-types";

export const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  branding: Palette,
  web: Globe,
  photo: Camera,
  video: Clapperboard,
  print: LayoutTemplate,
  other: Shapes,
};
