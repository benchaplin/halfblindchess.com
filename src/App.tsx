import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Nav from "./Nav.tsx";
import { Link, Outlet } from "react-router-dom";

export default function App() {
    useEffect(() => {
        if (!localStorage.getItem("playerId")) {
            localStorage.setItem("playerId", `p_${uuidv4().split("-")[0]}`);
        }
    }, []);

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
