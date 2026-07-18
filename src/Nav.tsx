import { Link } from "react-router-dom";

type NavProps = {
    username: string;
    onEditName: () => void;
};

export default function Nav({ username, onEditName }: NavProps) {
    return (
        <div className="text-right" style={{ marginRight: 30 }}>
            <Link to="/">
                <img
                    src="../hbc.png"
                    className="inline mb-4"
                    width="35"
                    alt=""
                />
            </Link>
            <ul>
                <li className="mb-1 link">
                    <Link to="/">Home</Link>
                </li>
                <li className="mb-1 link">
                    <Link to="/game">Play</Link>
                </li>
                <li className="mb-1 link">
                    <Link to="/about">About</Link>
                </li>
            </ul>
            <div className="mt-4 text-xs">
                {username ? (
                    <>
                        <div className="font-bold">{username}</div>
                        <button className="link" onClick={onEditName}>
                            edit
                        </button>
                    </>
                ) : (
                    <button className="link" onClick={onEditName}>
                        set username
                    </button>
                )}
            </div>
        </div>
    );
}
