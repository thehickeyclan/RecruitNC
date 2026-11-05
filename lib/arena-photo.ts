/**
 * The arena photo behind page headers. RecruitWrestlers is national, so it never shows a state
 * association's arena (Matt, 5 Nov 2026): the Fargo nationals floor there, NCHSAA on NC United.
 * NEXT_PUBLIC_RW_PROJECT is set at build on the RecruitWrestlers deployment, so server and browser agree.
 */
export const ARENA_PHOTO = process.env.NEXT_PUBLIC_RW_PROJECT === "1" ? "/hero-fargo-arena.jpg" : "/hero-banner-nchsaa-2026-arena.png"
