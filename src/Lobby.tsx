import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link, useNavigate } from "react-router-dom";
import ErrorAlert from "./ErrorAlert";
import { SERVER_URL } from "./constants";
import { socket } from "./socket";
import { GameSummary } from "../types/gameTypes";

const fmtTimeControl = (tc: GameSummary["timeControl"]) =>
    `${Math.round(tc.base / 60_000)}+${Math.round(tc.increment / 1_000)}`;

const displayName = (username?: string) => username || "Anonymous";

const TIME_CONTROLS = [
    { label: "3 + 2", base: 180_000, increment: 2_000 },
    { label: "5 + 0", base: 300_000, increment: 0 },
    { label: "5 + 3", base: 300_000, increment: 3_000 },
    { label: "10 + 0", base: 600_000, increment: 0 },
];

export default function Lobby() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [tcIndex, setTcIndex] = useState(1); // default 5 + 0
    const { data: games, error: gamesError } = useQuery("games", () =>
        fetch(`${SERVER_URL}/api/game`).then((res) => res.json())
    );

    // live lobby: subscribe to broadcasts and patch the query cache
    useEffect(() => {
        socket.connect();
        socket.emit("joinLobby");
        const onLobby = (summaries: GameSummary[]) =>
            queryClient.setQueryData("games", summaries);
        socket.on("lobbyUpdate", onLobby);
        return () => {
            socket.off("lobbyUpdate", onLobby);
            socket.emit("leaveLobby");
            socket.disconnect();
        };
    }, []);
    const {
        mutate: createNewGame,
        isLoading: isCreatingNewGame,
        error: newGameError,
    } = useMutation({
        mutationFn: async () => {
            const { base, increment } = TIME_CONTROLS[tcIndex];
            return fetch(`${SERVER_URL}/api/game`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    playerId: localStorage.getItem("playerId"),
                    username: localStorage.getItem("username"),
                    timeControl: { base, increment },
                }),
            }).then((res) => res.json());
        },
        onSuccess: (data) => {
            // drop the creator straight into their game; the game page shows
            // the shareable link while waiting for an opponent
            navigate(`/game/${data.gameId}`);
        },
    });

    return (
        <div>
            <div className="mb-4">
                <label className="mr-2">Time control:</label>
                <select
                    className="border border-solid border-slate-800 rounded py-1 px-2 font-mono"
                    value={tcIndex}
                    onChange={(e) => setTcIndex(Number(e.target.value))}
                >
                    {TIME_CONTROLS.map((tc, i) => (
                        <option key={tc.label} value={i}>
                            {tc.label}
                        </option>
                    ))}
                </select>
            </div>
            <button
                className="bg-amber-600 hover:bg-amber-800 text-white rounded py-2 px-3"
                onClick={() => createNewGame()}
                disabled={isCreatingNewGame}
            >
                Create game
            </button>
            {newGameError && (
                <ErrorAlert>
                    Something went wrong creating a new game.
                </ErrorAlert>
            )}
            <hr className="my-10 border-black" />
            <h2 className="text-l my-5">Games in progress:</h2>
            <ul className="list-disc">
                {games?.map((game: GameSummary) => (
                    <li key={game.gameId}>
                        <Link className="link" to={`/game/${game.gameId}`}>
                            {game.status === "waiting"
                                ? `${displayName(
                                      game.player1Username
                                  )} — waiting for opponent`
                                : `${displayName(
                                      game.player1Username
                                  )} vs ${displayName(game.player2Username)}`}
                        </Link>
                        <span className="ml-2 text-xs text-stone-600">
                            ({fmtTimeControl(game.timeControl)})
                        </span>
                    </li>
                ))}
                {games?.length === 0 && (
                    <li className="list-none text-stone-600 italic">
                        No games in progress.
                    </li>
                )}
                {gamesError && (
                    <ErrorAlert>
                        Something went wrong fetching games.
                    </ErrorAlert>
                )}
            </ul>
        </div>
    );
}
