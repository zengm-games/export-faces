#!/usr/bin/env node

import { faceToSvgString } from "facesjs";
import sharp from "sharp";
import Pick from "stream-json/filters/Pick.js";
import StreamArray from "stream-json/streamers/StreamArray.js";
import { unusedFilename } from "unused-filename";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";

const options = {
    league: {
        type: "string",
    },
    folder: {
        type: "string",
        default: "exported-faces",
    },
    season: {
        type: "string",
        default: "current",
    },
};
const parsedArgs = parseArgs({ options });

const inputFilename = parsedArgs.values.league;
const exportFolder = await unusedFilename(parsedArgs.values.folder);
let season = parseInt(parsedArgs.values.season);
if (Number.isNaN(season)) {
    season = "current";
}

if (!fs.existsSync(exportFolder)){
    fs.mkdirSync(exportFolder);
}

const teams = [];

const processPlayer = async (p) => {
    let tid;
    if (season === "current") {
        if (p.tid < -2) {
            return;
        }
        tid = p.tid;
    } else {
        const stats = p.stats.findLast(row => row.season === season);
        if (!stats) {
            return;
        }
        tid = stats.tid;
    }

    if (p.imgURL) {
        // Ignore imgURL ones for now - could download, but I don't want people to accidentally use this and DDOS someone
        return;
    }

    let t;
    if (teams[tid]) {
        t = teams[tid];
    } else if (tid === -1) {
        t = {
            abbrev: "FA",
            colors: ["#000", "#00F", "#F00"],
            jersey: "jersey3",
        };
    } else if (tid === -2) {
        t = {
            abbrev: `DP${p.draft.year}`,
            colors: ["#000", "#00F", "#F00"],
            jersey: "jersey3",
        };
    } else {
        throw new Error(`Invalid tid ${tid}`)
    }

    const svg = faceToSvgString(p.face, {
        teamColors: t.colors,
        jersey: {
            id: t.jersey,
        },
    });

    const outputFilename = `${t.abbrev} - ${p.lastName}, ${p.firstName}.png`;

    await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(exportFolder, outputFilename));
}

const isGzip = inputFilename.endsWith(".gz");

console.log(`Loading ${season} team data...`);

const teamStreams = [
    Pick.withParser({ filter: "teams" }),
    StreamArray.streamArray(),
    async function* (rows) {
        for await (const row of rows) {
            const t = row.value;
            let found = false;
            if (season !== "current") {
                const ts = t.seasons.findLast(row => row.season === season);
                if (ts) {
                    found = true;
                    teams[t.tid] = {
                        abbrev: ts.abbrev,
                        colors: ts.colors,
                        jersey: ts.jersey,
                    };
                }
            }

            if (!found) {
                teams[t.tid] = {
                    abbrev: t.abbrev,
                    colors: t.colors,
                    jersey: t.jersey,
                };
            }
        }
    },
];

if (isGzip) {
    teamStreams.unshift(new DecompressionStream("gzip"));
}

await pipeline(
    fs.createReadStream(inputFilename),
    ...teamStreams,
);

console.log(`Exporting images to "${exportFolder}"...`);

const playerStreams = [
    Pick.withParser({ filter: "players" }),
    StreamArray.streamArray(),
    async function* (rows) {
        for await (const row of rows) {
            yield await processPlayer(row.value);
        }
    },
];

if (isGzip) {
    playerStreams.unshift(new DecompressionStream("gzip"));
}

await pipeline(
    fs.createReadStream(inputFilename),
    ...playerStreams,
);

console.log("Done!");
