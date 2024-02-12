import path from "node:path";
import fsp from "node:fs/promises";

function parseTxtMem(mem: string): { bytes: number[]; base: number } {
  let base = 0;
  const bytes = mem.split("\n").flatMap((line, linei) => {
    if (!line?.trim()) {
      return [];
    }

    // throw away blank splits and anything beyond the byte strings
    // this accounts for when the ascii representation has spaces in it
    const pieces = line
      .split(" ")
      .filter((p) => p?.trim()?.length > 0)
      .slice(0, 9);

    // throw away address
    const baseTxt = pieces.shift();

    if (linei === 0) {
      base = parseInt(baseTxt as string, 16);
    }

    // throw away ascii representation
    pieces.pop();

    return pieces.flatMap((textWord) => {
      if (!textWord?.trim()) {
        return [];
      }
      const lowerByteS = textWord.substring(0, 2);
      const upperByteS = textWord.substring(2);

      const lowerByte = parseInt(lowerByteS, 16);
      const upperByte = parseInt(upperByteS, 16);

      return [lowerByte, upperByte];
    });
  });

  return { bytes, base };
}

async function main(mem1Path: string, mem2Path: string): Promise<void> {
  const mem1txt = (await fsp.readFile(mem1Path)).toString();
  const mem2txt = (await fsp.readFile(mem2Path)).toString();

  console.log("mem1txt line count", mem1txt.split("\n").length);
  console.log("mem2txt line count", mem2txt.split("\n").length);

  const { bytes: mem1bytes, base: base1 } = parseTxtMem(mem1txt);
  const { bytes: mem2bytes, base: base2 } = parseTxtMem(mem2txt);

  if (mem1bytes.length !== mem2bytes.length) {
    throw new Error(
      `First dump has ${mem1bytes.length} bytes and second has ${mem2bytes.length}, they should be equal`
    );
  }

  if (base1 !== base2) {
    throw new Error(
      `First dump has base ${base1.toString(16)} and dump 2 has ${base2.toString(16)}, they should be equal`
    );
  }

  let diffCount = 0;

  for (let i = 0; i < mem1bytes.length; ++i) {
    if (mem1bytes[i] !== mem2bytes[i]) {
      diffCount += 1;
      console.log(
        `${(base1 + i).toString(16)}: ${mem1bytes[i].toString(16)} / ${mem2bytes[i].toString(16)}`
      );
    }
  }

  console.log({ diffCount });
}

const [_tsnode, _txtPalToPngPal, mem1txt, mem2txt] = process.argv;

if (!mem1txt || !mem2txt) {
  console.error("usage: ts-node memDiff.ts <mem-dump-1> <mem-dump-2>");
  process.exit(1);
}

const mem1txtPath = path.resolve(process.cwd(), mem1txt);
const mem2txtPath = path.resolve(process.cwd(), mem2txt);

main(mem1txtPath, mem2txtPath)
  .then(() => console.log("done"))
  .catch((e) => console.error(e));
