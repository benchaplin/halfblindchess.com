# halfblindchess.com

https://halfblindchess.com is a free, open-source chess server for the half-blind chess variant.

## Development

The codebase is made of of two sections:

1. the React (Vite) frontend in `src/`

    ```
    npm install
    npm run dev
    ```

2. the backend (Express / Socket.io with Redis) in `game-server/`

    ```
    cd game-server
    npm install
    npm run dev
    ```
