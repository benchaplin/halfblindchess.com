import { router } from "../trpc";
import { gameRouter } from "./game";

export const appRouter = router({
  game: gameRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
