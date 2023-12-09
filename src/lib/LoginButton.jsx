import { useEffect } from "react";
import { loadGSIScript, getOauthToken } from "../scripts/login.ts";
import googleIcon from "../assets/google.png";

const LoginButton = () => {
    useEffect(() => {
        try {
            loadGSIScript();
        } catch (error) {
            console.warn(error);
        }
    }, []);

    return (
        <>
            <button className="button__signin btn" onClick={getOauthToken}>
                <img src={googleIcon} alt="google signin icon" />
            </button>
        </>
    );
};

export default LoginButton;
