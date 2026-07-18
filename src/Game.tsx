import { useRef, useEffect, useState } from "react";
import { setupBoard, setupAfterMoveEvt } from "./utils/hbcgHelpers";
import { socket } from "./socket";
import { useParams, useNavigate } from "react-router-dom";
import {
    StringifiableGameState,
    EndReason,
    SeatAssignment,
    Presence,
} from "../types/gameTypes";
import { Color, Key } from "halfblindchessground/types";
import NameBadge from "./components/NameBadge";
import Clock from "./components/Clock";
import { CopyToClipboard } from "react-copy-to-clipboard";

const REASON_TEXT: Record<EndReason, string> = {
    checkmate: "checkmate",
    resignation: "resignation",
    timeout: "timeout",
    "draw-agreement": "agreement",
    draw: "the board",
};

export default function Game() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const board = useRef(null);

    const playerId = localStorage.getItem("playerId");
    const username = localStorage.getItem("username");

    const [gameState, setGameState] = useState<StringifiableGameState | null>(
        null
    );
    // our own color, told privately by the server (no ids are broadcast)
    const [myColor, setMyColor] = useState<Color | null>(null);
    // which seats currently have a connected socket
    const [presence, setPresence] = useState<Presence | null>(null);

    // connect, join, and wire listeners — keyed on gameId so a rematch
    // navigation cleanly tears down and re-subscribes.
    useEffect(() => {
        setGameState(null);
        setMyColor(null);
        setPresence(null);
        socket.connect();
        socket.emit("joinGame", { gameId, playerId, username });

        const onGameState = (state: StringifiableGameState) =>
            setGameState(state);
        const onYouAre = ({ color }: SeatAssignment) => setMyColor(color);
        const onPresence = (p: Presence) => setPresence(p);
        const onRematchReady = ({ gameId: newId }: { gameId: string }) =>
            navigate(`/game/${newId}`);

        socket.on("gameState", onGameState);
        socket.on("youAre", onYouAre);
        socket.on("presence", onPresence);
        socket.on("rematchReady", onRematchReady);

        return () => {
            socket.off("gameState", onGameState);
            socket.off("youAre", onYouAre);
            socket.off("presence", onPresence);
            socket.off("rematchReady", onRematchReady);
            socket.disconnect();
        };
    }, [gameId]);

    // (re)render the board whenever game state or our seat changes
    useEffect(() => {
        if (!gameState || board.current === null) return;
        const orientation: Color = myColor || "white";
        const dests: Map<Key, Key[]> = new Map(JSON.parse(gameState.dests));
        const viewOnly =
            gameState.status !== "active" ||
            myColor === null ||
            myColor !== gameState.turn;

        const cg = setupBoard(
            board.current,
            { ...gameState, dests },
            orientation,
            viewOnly
        );
        if (!viewOnly) setupAfterMoveEvt(cg, socket, gameId!, playerId!);
    }, [gameState, myColor]);

    if (!gameState) {
        return <div ref={board} style={{ width: 500, height: 500 }} />;
    }

    const orientation: Color = myColor || "white";
    const opponentColor: Color = myColor === "white" ? "black" : "white";
    const isPlayer = myColor !== null;
    const active = gameState.status === "active";
    const finished = gameState.status === "finished";

    const p1Name = gameState.player1Username || "Anonymous";
    const p2Name =
        gameState.status === "waiting"
            ? undefined
            : gameState.player2Username || "Anonymous";

    // top badge shows the opponent (from this viewer's orientation)
    const topIsWhite = orientation === "black";
    const topName = topIsWhite ? p1Name : p2Name;
    const bottomName = topIsWhite ? p2Name : p1Name;
    const topTime = topIsWhite ? gameState.player1Time : gameState.player2Time;
    const bottomTime = topIsWhite
        ? gameState.player2Time
        : gameState.player1Time;
    const topColor: Color = topIsWhite ? "white" : "black";
    const bottomColor: Color = topIsWhite ? "black" : "white";

    // presence dots only for occupied seats, once presence is known
    const topConnected =
        presence && topName !== undefined ? presence[topColor] : undefined;
    const bottomConnected =
        presence && bottomName !== undefined ? presence[bottomColor] : undefined;
    // for the rematch UI: is my opponent currently here? (assume yes until known)
    const opponentPresent = presence ? presence[opponentColor] : true;

    const resultText = () => {
        if (gameState.winner === "draw") {
            return `Draw by ${
                gameState.endReason ? REASON_TEXT[gameState.endReason] : "agreement"
            }.`;
        }
        if (gameState.winner) {
            const who = gameState.winner === "white" ? "White" : "Black";
            const reason = gameState.endReason
                ? REASON_TEXT[gameState.endReason]
                : "";
            return `${who} wins by ${reason}.`;
        }
        return "";
    };

    return (
        <>
            <div className="my-4 flex items-center justify-between">
                <NameBadge
                    color="red"
                    name={topName}
                    winner={gameState.winner === topColor}
                    connected={topConnected}
                />
                <Clock
                    timeMs={topTime}
                    active={active && gameState.turn === topColor}
                />
            </div>
            <div ref={board} style={{ width: 500, height: 500 }} />
            {finished && (
                <div className="overlay-window">
                    <p>{resultText()}</p>
                </div>
            )}
            <div className="my-4 flex items-center justify-between">
                <NameBadge
                    color="green"
                    name={bottomName}
                    winner={gameState.winner === bottomColor}
                    connected={bottomConnected}
                />
                <Clock
                    timeMs={bottomTime}
                    active={active && gameState.turn === bottomColor}
                />
            </div>

            {isPlayer && gameState.status === "waiting" && (
                <div className="my-4">
                    <p className="mb-2">
                        Waiting for an opponent — share this link:
                    </p>
                    <p>
                        <CopyToClipboard
                            text={window.location.href}
                            onCopy={() =>
                                document
                                    .querySelector(".copy-icon")
                                    .classList.add("animate-copied")
                            }
                        >
                            <img
                                className="hover:cursor-pointer inline mr-2 copy-icon"
                                src="../copy.svg"
                                width="25"
                                alt="copy"
                            />
                        </CopyToClipboard>
                        <span className="link break-all">
                            {window.location.href}
                        </span>
                    </p>
                </div>
            )}

            {isPlayer && active && (
                <div className="my-4 flex gap-2 items-center">
                    <button
                        className="bg-stone-200 border border-solid border-slate-800 rounded py-2 px-3"
                        onClick={() =>
                            socket.emit("resign", { gameId, playerId })
                        }
                    >
                        Resign
                    </button>
                    {gameState.drawOfferFrom === opponentColor ? (
                        <div className="draw-flash border border-solid border-slate-800 rounded py-2 px-3 flex gap-2 items-center">
                            <span className="text-sm font-bold">
                                Opponent offers a draw:
                            </span>
                            <button
                                className="bg-white border border-solid border-slate-800 rounded py-1 px-3"
                                onClick={() =>
                                    socket.emit("respondDraw", {
                                        gameId,
                                        playerId,
                                        accept: true,
                                    })
                                }
                            >
                                Accept
                            </button>
                            <button
                                className="bg-white border border-solid border-slate-800 rounded py-1 px-3"
                                onClick={() =>
                                    socket.emit("respondDraw", {
                                        gameId,
                                        playerId,
                                        accept: false,
                                    })
                                }
                            >
                                Decline
                            </button>
                        </div>
                    ) : gameState.drawOfferFrom === myColor ? (
                        <span className="text-sm italic">
                            Draw offer sent…
                        </span>
                    ) : (
                        <button
                            className="bg-stone-200 border border-solid border-slate-800 rounded py-2 px-3"
                            onClick={() =>
                                socket.emit("offerDraw", { gameId, playerId })
                            }
                        >
                            Offer draw
                        </button>
                    )}
                </div>
            )}

            {isPlayer && finished && (
                <div className="my-4 flex gap-2 items-center">
                    <button
                        className="bg-amber-600 hover:bg-amber-800 text-white rounded py-2 px-3 disabled:opacity-50 disabled:hover:bg-amber-600"
                        disabled={!opponentPresent}
                        onClick={() =>
                            socket.emit("rematch", { gameId, playerId })
                        }
                    >
                        {gameState.rematchOfferFrom === opponentColor
                            ? "Accept rematch"
                            : "Rematch"}
                    </button>
                    <button
                        className="bg-stone-200 border border-solid border-slate-800 rounded py-2 px-3"
                        onClick={() => navigate("/game")}
                    >
                        Exit
                    </button>
                    {!opponentPresent ? (
                        <span className="text-sm italic text-stone-500">
                            Opponent left
                        </span>
                    ) : gameState.rematchOfferFrom === myColor ? (
                        <span className="text-sm italic">
                            Rematch offer sent…
                        </span>
                    ) : gameState.rematchOfferFrom === opponentColor ? (
                        <span className="text-sm">
                            Opponent wants a rematch
                        </span>
                    ) : null}
                </div>
            )}

            {!isPlayer && (
                <div className="my-4">
                    <p className="text-sm italic mb-2">Spectating</p>
                    <button
                        className="bg-stone-200 border border-solid border-slate-800 rounded py-2 px-3"
                        onClick={() => navigate("/game")}
                    >
                        Leave
                    </button>
                </div>
            )}
        </>
    );
}
