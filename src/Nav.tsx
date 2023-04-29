import { Link } from "react-router-dom";

export default function Nav() {
  return (
    <div className="text-right" style={{ marginRight: 30, marginTop: 52 }}>
      <ul>
        <li className="mb-1 text-indigo-700 hover:underline">
          <Link to="/">Home</Link>
        </li>
        <li className="mb-1 text-indigo-700 hover:underline">
          <Link to="/game">Play</Link>
        </li>
        <li className="mb-1 text-indigo-700 hover:underline">
          <Link to="/">About</Link>
        </li>
      </ul>
    </div>
  );
}
