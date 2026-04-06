import Feed from "../../../components/Feed";

export default async function FeedPage(props: PageProps<"/feed/[token]">) {
  const { token } = await props.params;
  return <Feed token={token} />;
}
