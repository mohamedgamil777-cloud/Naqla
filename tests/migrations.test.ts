import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { checksum, migrationFiles } from "@/db/migrate";

describe("migration history", () => {
  const files = migrationFiles();

  it("is one numbered, gap-free sequence", () => {
    const nums = files.map((f) => Number(f.name.slice(0, 4)));
    const expected = nums.filter((n) => n !== 2); // 0002 was seed data → now db/seed.ts + db/seeds/
    expect(nums).toEqual(expected);
    for (let i = 1; i < nums.length; i++) {
      const prev = nums[i - 1];
      expect(nums[i]).toBe(prev === 1 ? 3 : prev + 1);
    }
  });

  it("keeps seed data out of migrations", () => {
    expect(files.some((f) => /seed/.test(f.name))).toBe(false);
    expect(readdirSync(join(process.cwd(), "db", "seeds"))).toContain("fleet.ts");
  });

  it("checksums ignore Windows line endings", () => {
    expect(checksum("a\r\nb\r\n")).toBe(checksum("a\nb\n"));
  });

  it("preserves the no-overlap booking protection", () => {
    const init = files.find((f) => f.name === "0001_init.sql")!;
    expect(init.sql).toMatch(/btree_gist/);
    expect(init.sql).toMatch(/EXCLUDE USING gist/i);
  });
});
