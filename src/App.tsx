import Nav from "./Nav.tsx";
import { Outlet } from "react-router-dom";

export default function App() {
    return (
        <main
            className="flex min-h-screen justify-center bg-stone-300 font-mono"
            style={{ paddingTop: 200, paddingBottom: 200 }}
        >
            <Nav />
            <div style={{ width: 600 }}>
                <h1 className="text-2xl mb-5">Half-Blind Chess</h1>
                <Outlet />
            </div>
        </main>
    );
}
