import type { ComponentType } from "react";
import { XIcon, type IconProps } from "../ui/icons";

/** core/services.ts の ServiceDefinition.id → アイコン。core に React を持ち込まないための境界。 */
export const SERVICE_PRESET_ICONS: Record<string, ComponentType<IconProps>> = {
  x: XIcon,
};
