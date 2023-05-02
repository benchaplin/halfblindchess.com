import { useRef, useEffect } from "react";
import { setupBoardDefault } from "./utils/hbcgHelpers";

export default function Home() {
  const board = useRef(null);

  useEffect(() => {
    setupBoardDefault(board.current!);
  }, []);

  return (
    <div className="my-2">
      <div ref={board} style={{ width: 500, height: 500 }} />
      <p className="mt-5">
        Half-blind chess is a chess variant with an element of surprise.
      </p>
      <h2 className="text-xl font-bold my-5">Rules</h2>
      <ul className="list-disc">
        <li className="mb-2">
          Every third turn, starting with black's first move, a player makes a
          <b> half-blind move</b>.
        </li>
        <li className="mb-2">
          A <b>half-blind move</b> is a move in which the opposing player only
          sees which piece was moved, not where it was moved to.
        </li>
        <li className="ml-4">
          The position of the piece remains hidden until the next turn has been
          made.
        </li>
      </ul>
    </div>
  );
}
