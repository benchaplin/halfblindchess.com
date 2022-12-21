import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";

import { trpc } from "../utils/trpc";
import exGame from "../../public/ex.png";
import Link from "next/link";

const Home: NextPage = () => {
  const router = useRouter();

  const newGame = trpc.game.new.useMutation({
    async onSuccess(id: string) {
      router.push(`game/${id}`);
    },
  });

  return (
    <>
      <Head>
        <title>Half-Blind Chess</title>
        <meta name="description" content="" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-stone-300 font-mono">
        <div className="flex-none">
          <h1 className="text-2xl">Half-Blind Chess</h1>
          <Image src={exGame} width="400" alt="chess_game" className="my-4" />
          <div className="mb-2">
            <button
              className="rounded-none bg-stone-700 py-2 px-4 text-white hover:bg-stone-400 hover:text-black"
              onClick={() => newGame.mutate()}
            >
              Create game
            </button>
          </div>
          <div className="mb-2">
            <Link href="game">
              <button className="rounded-none bg-stone-700 py-2 px-4 text-white hover:bg-stone-400 hover:text-black">
                See current games
              </button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;
