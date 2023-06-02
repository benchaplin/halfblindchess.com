# halfblindchess.com

https://halfblindchess.com is a free, open-source chess server for the half-blind chess variant.

## Development

The codebase has two services:

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

You will also need a local instance of redis running on port 6379. On OSX:

```
brew install redis
redis-server
```

Develop the app at http://localhost:5173, the backend runs on http://localhost:3000. Redis can be accessed directly with `redis-cli`.

## Deployment

### Dependencies

-   Linux distro with systemd/systemctl
-   [node@18](https://nodejs.org/en/download)
-   [redis](https://redis.io/docs/getting-started/installation/install-redis-on-linux/)
-   [nginx](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/)
-   [pm2](https://pm2.io/docs/runtime/guide/installation/)

### Deploy

Clone the code and run the deploy script:

```
git clone https://github.com/benchaplin/halfblindchess.com.git
chmod +x ./scripts/deploy.sh
./scripts/deploy.sh
```
