"use client";

import { VisSingleContainer, VisTooltip, VisTopoJSONMap } from "@unovis/react";
import { WorldMapTopoJSON } from "@unovis/ts/maps";

interface Props {
  areaData: { id: string }[];
  triggers: Record<string, (d: any) => string>;
  width: number;
}

export default function WorldMap({ areaData, triggers, width }: Props) {
  return (
    <VisSingleContainer
      data={{ areas: areaData }}
      width={width > 0 ? width * 0.65 : 400}
    >
      <VisTopoJSONMap topojson={WorldMapTopoJSON} />
      <VisTooltip triggers={triggers} />
    </VisSingleContainer>
  );
}
