import ReportClient from "./ReportClient";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ checkId: string }>;
}) {
  const { checkId } = await params;
  return <ReportClient checkId={checkId} />;
}
