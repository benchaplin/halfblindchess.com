import { Link } from "react-router-dom";

export default function Nav() {
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
                <li className="mb-1 text-indigo-700 hover:underline">
                    <Link to="/">Home</Link>
                </li>
                <li className="mb-1 text-indigo-700 hover:underline">
                    <Link to="/game">Play</Link>
                </li>
                <li className="mb-1 text-indigo-700 hover:underline">
                    <Link to="/about">About</Link>
                </li>
            </ul>
        </div>
    );
}
