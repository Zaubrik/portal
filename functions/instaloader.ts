import { spawnSubprocess } from "./subprocess.ts";
import { securePath } from "./path.ts";
import { getDirEntries } from "./fs.ts";
import { reverse } from "https://dev.zaubrik.com/sorcery@v0.1.4/collections/update.js";
import { basename, extname } from "https://deno.land/std@0.220.1/path/mod.ts";
import { contentType } from "https://deno.land/std@0.220.1/media_types/mod.ts";

export interface DownloadOptions {
  profile: string;
  mediaType: "video" | "image" | "all";
  keep: number;
}

const mediaTypes = { all: ["mp4", "jpg"], video: ["mp4"], image: "jpg" };

function removeOtherMediaTypes(mediaType: DownloadOptions["mediaType"]) {
  return (name: string) => name.endsWith(`.${mediaTypes[mediaType]}`);
}

function getFilepath(targetDirectory: string) {
  return (name: string) => securePath(targetDirectory)(name);
}

export async function download(
  { profile, mediaType, keep }: DownloadOptions,
) {
  const homeDirectory = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
  const instaloader = `instaloader`;
  const mediaFlag = mediaType === "all"
    ? ""
    : mediaType === "video"
    ? "--no-images"
    : "--no-videos";
  const targetDirectory = await Deno.makeTempDir({
    prefix: "instaloader-",
    suffix: `-${profile}-${mediaType}`,
  });
  await spawnSubprocess(instaloader, {
    args: [
      profile,
      mediaFlag,
      `--dirname-pattern=${targetDirectory}`,
      "--no-profile-pic",
      // "--latest-stamps",
      // "--no-posts",
    ],
  });

  return targetDirectory;
}

async function createFormDataFromFiles(filePaths: string[]): Promise<FormData> {
  const formData = new FormData();
  console.log("filePaths:", filePaths);

  for (const filePath of filePaths) {
    const fileContent = await Deno.readFile(filePath);
    const extension = extname(filePath);
    const mimeType = contentType(extension);
    const fileName = basename(filePath);
    const file = new File([fileContent], fileName, { type: mimeType });
    formData.append("instagram", file);
  }
  return formData;
}

async function downloadInstagramProfile(
  { profile, mediaType, keep }: DownloadOptions,
) {
  const targetDirectory = await download({ profile, mediaType, keep });

  const formData = await createFormDataFromFiles(reverse(
    (await getDirEntries(targetDirectory))
      .map((entry) => entry.name)
      .sort()
      .filter(removeOtherMediaTypes(mediaType))
      .slice(-3)
      .map(getFilepath(targetDirectory)),
  ));
  await Deno.remove(targetDirectory, { recursive: true });
  return formData;
}

const result = await downloadInstagramProfile({
  profile: "TimoRossa2",
  mediaType: "image",
  keep: 3,
});

console.log("result:", ...result);
