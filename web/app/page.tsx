import Image from "next/image";

export function HomeLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className="text-xl hover:underline underline-offset-4">
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Image
        src="/tabbit.png"
        className="mb-4"
        alt="Tabbit"
        width={100}
        height={100}
      />
      <h1 className="text-3xl font-bold">Tabbit Functional Demo</h1>
      <HomeLink href="/scan">Scan a receipt</HomeLink>
    </div>
  );
}
