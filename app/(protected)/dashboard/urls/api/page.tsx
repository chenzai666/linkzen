import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import ApiReference from "@/components/shared/api-reference";

export const metadata = constructMetadata({
  title: "API Reference",
  description: "Short URLs API reference.",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  return (
    <>
      <ApiReference
        badge="POST /api/v1/short"
        target="creating short urls"
        link="/docs/short-urls#api-reference"
      />
      <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "wrdo-api-key: YOUR_API_KEY" \\
  -d '{
    "target": "https://example.com",
    "url": "abc123",
    "expiration": "-1",
    "prefix": "your-domain",
    "visible": 1,
    "active": 1,
    "password": ""
  }' \\
  https://your-domain/api/v1/short`}
      </pre>
    </>
  );
}
