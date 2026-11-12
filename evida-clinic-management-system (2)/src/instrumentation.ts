export async function register() {
  if (process.env.NEXT_PHASE === "phase-build") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { bootstrapDatabase } = await import("@/db/bootstrap");
    const result = await bootstrapDatabase();
    if (result.seeded) {
      console.log("[evida] created tables + seeded demo clinic data");
    }
  } catch (error) {
    console.warn("[evida] database bootstrap skipped:", (error as Error).message);
  }
}
