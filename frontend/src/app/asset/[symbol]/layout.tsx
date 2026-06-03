import { AssetTabs } from "@/components/navigation/asset-tabs";

export default function AssetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ symbol: string }>;
}) {
  return (
    <div className="mx-auto max-w-screen-2xl">
      <AssetTabsWrapper params={params} />
      {children}
    </div>
  );
}

async function AssetTabsWrapper({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <AssetTabs symbol={symbol.toUpperCase()} />;
}
