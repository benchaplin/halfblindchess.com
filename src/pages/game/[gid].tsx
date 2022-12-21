import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Chessground } from "halfblindchessground/chessground.js";

import { trpc } from "../../utils/trpc";
import { HalfBlindChess } from "../../../../halfblindchess";
import { playOtherSide, toDests } from "../../utils/chessground";

const Game: NextPage = () => {
  const router = useRouter();
  const { gid } = router.query;

  const game = trpc.game.byId.useQuery(gid as string);
  const move = trpc.game.move.useMutation();

  if (game.data) {
    const chess = new HalfBlindChess(game.data.fen);

    const cg = Chessground(document.getElementById("board")!, {
      movable: {
        color: "white",
        free: false,
        dests: toDests(chess),
      },
    });
    cg.set({
      movable: {
        events: {
          after: playOtherSide(cg, chess, gid as string, move.mutate),
        },
      },
    });
  }

  return (
    <>
      <Head>
        <title>Half-Blind Chess: {gid}</title>
        <meta name="description" content="" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-stone-200 font-mono">
        <div className="flex-none">
          <h1 className="mb-2 text-xl">Game ID: {gid}</h1>
          <div id="board" style={{ width: 400, height: 400 }} />
          <div className="my-2">
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

export default Game;
