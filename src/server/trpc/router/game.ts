import { z } from "zod";
import { nanoid } from "nanoid";

import { router, publicProcedure } from "../trpc";
import { HalfBlindChess } from "../../../../../halfblindchess";

export const gameRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const games = await ctx.prisma.game.findMany();
    return games;
  }),
  byId: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const game = await ctx.prisma.game.findUnique({
      where: {
        id: input
      }
    });
    return game;
  }),
  new: publicProcedure.mutation(async ({ ctx }) => {
    const id = nanoid(10);
    const game = new HalfBlindChess();
    await ctx.prisma.game.create({
      data: {
        id,
        fen: game.fen(),
      }
    })
    return id;
  }),
  move: publicProcedure.input(z.object({
    id: z.string(),
    fen: z.string(),
  })).mutation(async ({ input, ctx }) => {
    await ctx.prisma.game.update({
      where: {
        id: input.id
      },
      data: {
        fen: input.fen
      }
    })
  })
});
