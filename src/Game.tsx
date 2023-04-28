import { useRef, useEffect } from "react";
import { setupBoard } from "./utils/hbcgHelpers";

export default function Game() {
  const board = useRef(null);

  useEffect(() => {
    setupBoard(board.current!);
  }, []);

  return (
    <div>
      <h2 className="text-l my-5">Waiting for opponent...</h2>
      <div ref={board} style={{ width: 500, height: 500 }} />
    </div>
  );
}
