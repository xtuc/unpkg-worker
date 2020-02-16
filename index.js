// FIXME trotar uses Function() ...
globalThis.Function = () => {};
const {UsTarParser} = require("trotar");

const pako = require("pako");

function parseURL({ pathname }) {
  const s = { name: undefined, version: undefined, path: undefined };

  const parts = pathname.split("/");
  parts.shift();

  s.name = parts.shift();
  s.version = parts.shift();
  s.path = parts.join("/");

  return s;
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

function removePackageInPath(path) {
  return path.slice(8);
}

async function handleRequest(request) {
  const options = parseURL(new URL(request.url));
  console.log(getRegistryTarball(options));
  const res = await fetch(getRegistryTarball(options));

  // FIXME
  // gzip inflate can be too slow. If the response include a content encoding
  // header, cloudflare worker will inflate it for us.
  const tar = pako.inflate(await res.arrayBuffer());

  let out;

  const parser = new UsTarParser();
  parser.on("file", (name, content) => {
    if (removePackageInPath(name) === options.path) {
      out = content;

      // FIXME: implement aborting the parsing
      // parser.stop()
    }
  });

  parser.write(tar);
  parser.next();

  if (out === undefined) {
    return new Response(JSON.stringify(options.path) + " not found", { status: 404 });
  } else {
    return new Response(out);
  }
}

function getRegistryTarball({ name, version }) {
  return `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
}
