import { chaptersPartOne } from "./chapters-part-one";
import { chaptersPartTwo } from "./chapters-part-two";
import type { Chapter } from "./types";

export type { Chapter, Block, CalloutVariant } from "./types";

export const chapters: Chapter[] = [...chaptersPartOne, ...chaptersPartTwo];

export const getChapter = (slug: string): Chapter | undefined =>
  chapters.find((chapter) => chapter.slug === slug);

export const getAdjacentChapters = (slug: string) => {
  const index = chapters.findIndex((chapter) => chapter.slug === slug);
  return {
    previous: index > 0 ? chapters[index - 1] : null,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null,
  };
};

export const chapterPath = (slug: string) => `/app/capitulos/${slug}`;

export const totalReadingMinutes = chapters.reduce(
  (total, chapter) => total + chapter.readingMinutes,
  0,
);
