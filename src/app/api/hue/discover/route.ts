import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://discovery.meethue.com/", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to discover bridges" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Hue discovery error:", error);
    return NextResponse.json(
      { error: "Failed to discover bridges" },
      { status: 500 }
    );
  }
}

