import SourceManager from "../../../../components/SourceManager";

export default async function SourcesPage(
  props: PageProps<"/feed/[token]/sources">
) {
  const { token } = await props.params;
  return <SourceManager token={token} />;
}
