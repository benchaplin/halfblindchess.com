import Nav from "./Nav.tsx";
import { Link, Outlet } from "react-router-dom";

export default function App() {
    return (
        <main
            className="flex min-h-screen justify-center bg-stone-300 font-mono"
            style={{ paddingTop: 200, paddingBottom: 200 }}
        >
            <Nav />
            <div style={{ width: 600 }}>
                <Link to="/">
                    <h1 className="text-2xl mb-5">Half-Blind Chess</h1>
                </Link>
                <Outlet />
            </div>
        </main>
    );
}
