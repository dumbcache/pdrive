export const googleClient = {
    client: "",
    accessToken: "",
};

async function handleGoogleSignIn(tokenResponse: TokenResponse) {
    // const name = encodeURIComponent("Pocket_#Drive");
    // accessToken = tokenResponse.access_token;
    // window.localStorage.setItem("token", accessToken);
    // window.localStorage.setItem(
    //     "expires",
    //     String(Date.now() + tokenResponse.expires_in * 1000)
    // );
    // // clearTimeout(get(activeTimeout));
    // // checkSessionTimeout();
    // // sessionTimeout.set(false);
    // if (!window.localStorage.getItem("root")) {
    //     const res = await fetch(
    //         `https://www.googleapis.com/drive/v3/files?&pageSize=1&fields=files(id,name)&orderBy=createdTime`,
    //         {
    //             headers: { authorization: `Bearer ${accessToken}` },
    //         }
    //     );
    //     const { files } = await res.json();
    //     if (files.length !== 0) {
    //         window.localStorage.setItem("root", files[0].id);
    //     } else {
    //         const { id } = await createRootDir(accessToken);
    //         window.localStorage.setItem("root", id);
    //     }
    // }
    // if (get(isLoggedin)) return;
    // isLoggedin.set(true);
    // goto("/r");
    console.log(tokenResponse);
}

function initClient() {
    googleClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_PUBLIC_KRAB_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: handleGoogleSignIn,
    });
}
export function getOauthToken() {
    googleClient.requestAccessToken();
}

export function isTokenExpired() {
    return Date.now() > Number(window.localStorage.getItem("expires"));
}

export const loadGSIScript = () => {
    const src = "https://accounts.google.com/gsi/client";
    const header = document.querySelector(".header") as HTMLDivElement;
    const gsiIfExists = header.querySelector(`script[src='${src}']`);
    if (gsiIfExists) header.removeChild(gsiIfExists);
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
        initClient();
        // window.google.accounts.id.initialize({
        //     client_id: PUBLIC_KRAB_CLIENT_ID,
        //     nonce: PUBLIC_KRAB_NONCE_WEB,
        //     auto_select: false,
        //     callback: handleGoogleSignIn,
        // });
        // window.google.accounts.id.prompt();
        // window.google.accounts.id.renderButton(
        //     header.querySelector(".button__signin"),
        //     {
        //         type: "icon",
        //         shape: "circle",
        //         size: "medium",
        //     }
        // );
    };
    script.onerror = (e) => console.log(e);
    header.append(script);
};
