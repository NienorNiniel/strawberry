import { NextRequest, NextResponse } from "next/server";

export function withAuth(
  handler: (req: NextRequest) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest) => {
    const token = req.headers.get("x-auth-token");
    if (token !== process.env.SECRET_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req);
  };
}
