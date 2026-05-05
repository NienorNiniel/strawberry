import { redirect } from "next/navigation";
import StrawberryLogo from "../../../components/StrawberryLogo";
import Navigation from "../../../components/Navigation";

export default async function FeedLayout(
  props: LayoutProps<"/feed/[token]">
) {
  const { token } = await props.params;

  if (token !== process.env.SECRET_TOKEN) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center justify-center py-3 px-4">
          <StrawberryLogo size={38} />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto pb-20">{props.children}</main>

      {/* Bottom navigation */}
      <Navigation token={token} />
    </div>
  );
}
