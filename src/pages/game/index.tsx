import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

import { trpc } from "../../utils/trpc";

const AllGames: NextPage = () => {
  const games = trpc.game.list.useQuery();

  return (
    <>
      <Head>
        <title>Half-Blind Chess: All games</title>
        <meta name="description" content="" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-stone-300 font-mono">
        <div className="flex-none">
          <h1 className="mb-2 text-xl">Current games:</h1>
          <ul>
            {games.data?.map((game) => (
              <Link
                className="text-blue-600 underline visited:text-purple-600 hover:text-blue-800"
                href={`game/${game.id}`}
                key={game.id}
              >
                <li>{game.id}</li>
              </Link>
            ))}
          </ul>
          <div className="my-4">
            <Link href="/">
              <button className="rounded-none bg-stone-700 py-2 px-4 text-white hover:bg-stone-400 hover:text-black">
                &larr; Home
              </button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default AllGames;
