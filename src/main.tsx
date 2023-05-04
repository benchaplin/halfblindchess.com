import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

import "../styles/globals.css";
import "../styles/chessground.base.css";
import "../styles/chessground.brown.css";
import "../styles/chessground.cburnett.css";

import App from "./App";
import Home from "./Home";
import Game from "./Game";
import About from "./About";
import Lobby from "./Lobby";

const queryClient = new QueryClient();

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                path: "/",
                element: <Home />,
            },
            {
                path: "/game",
                element: <Lobby />,
            },
            {
                path: "/game/:gameId",
                element: <Game />,
            },
            {
                path: "/about",
                element: <About />,
            },
        ],
    },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </React.StrictMode>
);
