import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.platformRole === "super_admin" && !session.user.isActingAs) {
    redirect("/platform/companies");
  }

  redirect("/dashboard");
}
