import 'dotenv/config'

// discover-store.ts
// Usage:
//   HELIUS='https://mainnet.helius-rpc.com/?api-key=YOUR_KEY' npx tsx discover-store.ts
//   HELIUS='https://mainnet.helius-rpc.com/?api-key=YOUR_KEY' npx tsx discover-store.ts "solana mobile" "dapp store"

type Json = any;

const ENDPOINT = process.env.HELIUS_RPC;
if (!ENDPOINT) {
  console.error("Set HELIUS env var (your Helius DAS endpoint).");
  process.exit(1);
}

// Default queries if you don't pass CLI args
const QUERIES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["release", "app nft", "dapp store", "solana mobile"];

const PAGES = 6;           // how many pages per query to scan
const LIMIT = 1000;        // DAS page size
const SHOW_TOP = 5;        // how many top collections to expand
const EXPAND_LIMIT = 1000; // page size when expanding a collection

async function rpc(method: string, params: Json): Promise<Json> {
  const res = await fetch(ENDPOINT!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "x", method, params }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.error) {
    throw new Error(`${method} error: ${JSON.stringify(json.error)}`);
  }
  return json;
}

function getCollectionMint(item: Json): string | null {
  const grouping = item?.grouping ?? [];
  const col = grouping.find((g: any) => g?.group_key === "collection");
  return col?.group_value ?? null;
}

async function searchSweep(query: string, compressed: boolean) {
  const counts = new Map<string, number>();
  let totalItems = 0;

  for (let page = 1; page <= PAGES; page++) {
    const resp = await rpc("searchAssets", {
      name: query,  // Changed from 'query' to 'name'
      tokenType: "regularNft",
      compressed,
      page,
      limit: LIMIT,
      displayOptions: { showCollectionMetadata: true },
    });

    const items: Json[] = resp?.result?.items ?? [];
    if (!items.length) {
      if (page === 1) {
        console.log(`(no items for query="${query}", compressed=${compressed})`);
      }
      break;
    }

    totalItems += items.length;

    // Print a tiny preview so you know it's working
    for (const it of items.slice(0, 3)) {
      const id = it?.id ?? "";
      const name = it?.content?.metadata?.name ?? "";
      const col = getCollectionMint(it) ?? "(no collection)";
      console.log(`  • ${id}\t${col}\t${name}`);
    }

    // Tally collections
    for (const it of items) {
      const col = getCollectionMint(it);
      if (col) counts.set(col, (counts.get(col) ?? 0) + 1);
    }
  }

  return { counts, totalItems };
}

async function expandCollection(collectionMint: string) {
  console.log(`\n== Expanding collection: ${collectionMint}`);
  let cursor: string | null = null;

  do {
    const resp = await rpc("getAssetsByGroup", {
      groupKey: "collection",
      groupValue: collectionMint,
      limit: EXPAND_LIMIT,
      cursor,
    });

    const result = resp?.result ?? {};
    const items: Json[] = result?.items ?? [];
    for (const it of items) {
      const id = it?.id ?? "";
      const name = it?.content?.metadata?.name ?? "";
      const site = it?.content?.links?.external_url ?? "";
      const shortDesc = (it?.content?.metadata?.description ?? "")
        .replace(/\r?\n+/g, " ")
        .slice(0, 120);
      console.log([id, name, site, shortDesc].join("\t"));
    }

    cursor = result?.cursor ?? null;
  } while (cursor);
}

(async () => {
  console.log("Endpoint:", ENDPOINT);

  // Sanity check
  try {
    const health = await rpc("getHealth", []);
    console.log("Health:", health?.result ?? health);
  } catch (e) {
    console.error("Health check failed:", e);
    process.exit(1);
  }

  const grandCounts = new Map<string, number>();
  let anyHits = false;

  for (const q of QUERIES) {
    console.log(`\n=== Query: "${q}" (regular NFTs) ===`);
    const a = await searchSweep(q, false);
    if (a.totalItems) anyHits = true;

    console.log(`\n=== Query: "${q}" (compressed NFTs) ===`);
    const b = await searchSweep(q, true);
    if (b.totalItems) anyHits = true;

    // merge tallies
    for (const [k, v] of a.counts) grandCounts.set(k, (grandCounts.get(k) ?? 0) + v);
    for (const [k, v] of b.counts) grandCounts.set(k, (grandCounts.get(k) ?? 0) + v);
  }

  if (!anyHits) {
    console.log("\nNo items found for the queries tried. Try different terms, e.g.:");
    console.log('  npx tsx discover-store.ts "android" "solana mobile" "release"');
    return;
  }

  const top = [...grandCounts.entries()].sort((x, y) => y[1] - x[1]).slice(0, SHOW_TOP);
  if (!top.length) {
    console.log("\nFound items but none had a collection mint. Try different queries or increase PAGES.");
    return;
  }

  console.log("\nTop candidate collections (by frequency across results):");
  top.forEach(([mint, n], i) => console.log(`${i + 1}. ${mint}  (hits: ${n})`));

  // Expand each top collection
  for (const [mint] of top) {
    await expandCollection(mint);
  }
})();