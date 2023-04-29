import { useRef, useEffect } from "react";
import { setupBoard, setupAfterMoveEvt } from "./utils/hbcgHelpers";
import { socket } from "./socket";

export default function Game() {
  const board = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected");
    });

    socket.on("gameState", (gameState) => {
      console.log(
        `received gameState, color: ${gameState.color}, fen: ${gameState.fen}`
      );
      const dests = new Map(JSON.parse(gameState.dests));
      const cg = setupBoard(
        board.current!,
        gameState.fen,
        dests,
        gameState.color
      );
      setupAfterMoveEvt(cg, socket);
    });
  }, []);

  return (
    <div>
      <h2 className="text-l my-5">Waiting for opponent...</h2>
      <div ref={board} style={{ width: 500, height: 500 }} />
    </div>
  );
}
