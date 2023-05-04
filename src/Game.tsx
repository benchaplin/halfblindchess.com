import { useRef, useEffect } from "react";
import { setupBoard, setupAfterMoveEvt } from "./utils/hbcgHelpers";
import { socket } from "./socket";
import { useParams } from "react-router-dom";

export default function Game() {
    const { gameId } = useParams();
    const board = useRef(null);

    useEffect(() => {
        console.log("connecting");
        socket.connect();
        socket.emit("game", { gameId });

        socket.on("gameState", (gameState) => {
            console.log(`received gameState: ${JSON.stringify(gameState)}`);
            const dests = new Map(JSON.parse(gameState.dests));
            if (board.current !== null) {
                const cg = setupBoard(board.current, { ...gameState, dests });
                setupAfterMoveEvt(cg, socket, gameId);
            }
        });

        return () => {
            console.log("disconnecting");
            socket.disconnect();
        };
    }, [board]);

    return (
        <div>
            <h2 className="text-l my-5">
                <i>Waiting for opponent...</i>
            </h2>
            <div ref={board} style={{ width: 500, height: 500 }} />
        </div>
    );
}