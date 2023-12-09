import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Error from "./lib/Error.jsx";
import "./index.css";
import ColorTheme from "./lib/ColorTheme.jsx";

const router = createBrowserRouter([
    { path: "/", element: <App />, errorElement: <Error /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <ColorTheme>
            <RouterProvider router={router} />
        </ColorTheme>
    </React.StrictMode>
);
