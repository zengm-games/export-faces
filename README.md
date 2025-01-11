# @zengm-games/export-faces

Take a league file export from Basketball GM or any of the other ZenGM games, and generate a folder containig images of all the players, in PNG format.

First install [Node.js](https://nodejs.org/) and then you can run it like:

```
npx @zengm-games/export-faces --league BBGM_League_1_2025_preseason.json
```

By default that will export the current active players on their current teams, to a folder named "exported-faces".

You can also specify a couple additional options to customize this behavior.

Use the `--season` option to pick a season of faces to export, rather than current active players:

```
npx @zengm-games/export-faces --league BBGM_League_1_2025_preseason.json --season 2024
```

And use the `--folder` option to pick a different folder for the PNGs:

```
npx @zengm-games/export-faces --league BBGM_League_1_2025_preseason.json --folder my-folder
```
