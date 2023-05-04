import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import ErrorAlert from "./ErrorAlert";

export default function Lobby() {
    const { data, error } = useQuery("games", () =>
        fetch("http://localhost:3000/game").then((res) => res.json())
    );

    return (
        <div>
            <button className="bg-stone-600 hover:bg-stone-900 text-white rounded p-2">
                Create challenge link
            </button>
            <h2 className="text-l my-5">Games in progress:</h2>
            <ul className="list-disc">
                {data?.map((gameId: string) => (
                    <li key={gameId}>
                        <Link
                            className="text-indigo-700 hover:underline"
                            to={`/game/${gameId}`}
                        >
                            {gameId}
                        </Link>
                    </li>
                ))}
                {error && (
                    <ErrorAlert>
                        Something went wrong fetching games.
                    </ErrorAlert>
                )}
            </ul>
        </div>
    );
}
