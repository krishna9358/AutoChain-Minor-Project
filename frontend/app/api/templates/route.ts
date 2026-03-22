import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

export async function GET() {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      return NextResponse.json([]);
    }

    const files = fs
      .readdirSync(TEMPLATES_DIR)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    const templates = files
      .map((file) => {
        try {
          const content = fs.readFileSync(
            path.join(TEMPLATES_DIR, file),
            "utf-8",
          );
          return yaml.load(content);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to load templates:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 },
    );
  }
}
