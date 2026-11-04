import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// "ss" em Fraunces semibold, chocolate sobre rosa, como o icone do original.
export async function iconImage(size: number) {
  const font = await readFile(join(process.cwd(), "src/app/_fonts/Fraunces-SemiBold.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6E3E5",
          color: "#311D16",
          fontFamily: "Fraunces",
          fontSize: size * 0.58,
          letterSpacing: "-0.03em",
          paddingBottom: size * 0.04,
        }}
      >
        ss
      </div>
    ),
    { width: size, height: size, fonts: [{ name: "Fraunces", data: font, weight: 600 }] },
  );
}
