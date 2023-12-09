import { createContext, useState } from "react";

export const Theme = createContext({ theme: "" });

// eslint-disable-next-line react/prop-types
const ColorTheme = ({ children }) => {
    const [theme, setTheme] = useState(
        window.localStorage.getItem("theme") ?? ""
    );
    const toggleTheme = () => {
        setTheme((prevTheme) => {
            const current = prevTheme === "" ? "dark" : "";
            window.localStorage.setItem("theme", current);
            return current;
        });
    };
    return (
        <>
            <Theme.Provider value={{ theme, toggleTheme }}>
                {children}
            </Theme.Provider>
        </>
    );
};

export default ColorTheme;
