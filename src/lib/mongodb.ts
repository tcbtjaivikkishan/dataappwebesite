import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URI!;
if (!uri) throw new Error("MONGO_URI environment variable is not set");

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(uri);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db();

  return cachedDb;
}
