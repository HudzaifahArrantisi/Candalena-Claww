// src/adapters/mongodb.adapter.ts
import { DatabaseAdapter, Assignment, SchemaMapping } from "./adapter.interface";
import { detectColumns } from "../core/schema-detector";

// Lazy-load mongodb to avoid crash if not installed
let mongodb: any = null;
function getMongo() {
  if (!mongodb) {
    try {
      mongodb = require("mongodb");
    } catch {
      throw new Error(
        '[OpenClaw] MongoDB driver not installed. Run: npm install mongodb'
      );
    }
  }
  return mongodb;
}

export class MongoDBAdapter implements DatabaseAdapter {
  readonly engineName = "mongodb";
  private client: any;
  private db: any;
  private dbName: string;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    uri?: string;
  }) {
    const { MongoClient } = getMongo();
    this.dbName = config.database;

    // Support full URI override atau build dari parts
    const uri =
      config.uri ||
      (config.user && config.password
        ? `mongodb://${config.user}:${config.password}@${config.host}:${config.port}`
        : `mongodb://${config.host}:${config.port}`);

    this.client = new MongoClient(uri);
  }

  async testConnection(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    await this.db.command({ ping: 1 });
    console.log("[OpenClaw] ✅ MongoDB connected");
  }

  async detectSchema(collectionName: string): Promise<SchemaMapping> {
    const collection = this.db.collection(collectionName);
    // Sample satu document untuk detect field names
    const sample = await collection.findOne();
    if (!sample) {
      throw new Error(
        `[OpenClaw] Collection "${collectionName}" is empty. Cannot auto-detect schema. Please add at least one document or use manual column override.`
      );
    }
    const fieldNames = Object.keys(sample).filter((k) => k !== "__v");
    // Map _id → id for consistency
    const normalized = fieldNames.map((f) => (f === "_id" ? "id" : f));
    return detectColumns(normalized);
  }

  async scanAssignments(
    collectionName: string,
    schema: SchemaMapping
  ): Promise<Assignment[]> {
    const collection = this.db.collection(collectionName);
    const filter: any = {};
    filter[schema.notified] = { $in: [0, false] };

    const docs = await collection.find(filter).toArray();
    return docs.map((doc: any) => this.mapDoc(doc, schema));
  }

  async scanDeadlines(
    collectionName: string,
    schema: SchemaMapping,
    daysBeforeDeadline: number[]
  ): Promise<Assignment[]> {
    if (!schema.deadline) return [];

    const collection = this.db.collection(collectionName);
    const conditions = daysBeforeDeadline.map((d) => {
      const target = new Date();
      target.setDate(target.getDate() + d);
      target.setHours(0, 0, 0, 0);
      const next = new Date(target);
      next.setDate(next.getDate() + 1);
      return {
        [schema.deadline!]: { $gte: target, $lt: next },
      };
    });

    const filter = {
      $or: conditions,
      [schema.notified]: { $in: [1, true] }, // already notified for creation, but need deadline reminder
    };

    const docs = await collection.find(filter).toArray();
    return docs.map((doc: any) => this.mapDoc(doc, schema));
  }

  async markNotified(
    collectionName: string,
    schema: SchemaMapping,
    ids: (string | number)[]
  ): Promise<void> {
    if (ids.length === 0) return;
    const { ObjectId } = getMongo();
    const collection = this.db.collection(collectionName);

    // Handle both ObjectId and regular ids
    const objectIds = ids.map((id) => {
      try {
        return new ObjectId(id);
      } catch {
        return id;
      }
    });

    await collection.updateMany(
      { [schema.id === "id" ? "_id" : schema.id]: { $in: objectIds } },
      { $set: { [schema.notified]: 1 } }
    );
  }

  async queryAll(collectionName: string): Promise<any[]> {
    const collection = this.db.collection(collectionName);
    return collection.find().toArray();
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private mapDoc(doc: any, schema: SchemaMapping): Assignment {
    return {
      id: doc._id?.toString() || doc[schema.id],
      title: doc[schema.title] || "Untitled",
      telegram_channel: schema.telegramChannel ? doc[schema.telegramChannel] : null,
      course: schema.course ? doc[schema.course] : null,
      lecturer: schema.lecturer ? doc[schema.lecturer] : null,
      semester: schema.semester ? doc[schema.semester] : null,
      kelas: schema.kelas ? doc[schema.kelas] : null,
      deadline: schema.deadline ? doc[schema.deadline] : null,
      notified: doc[schema.notified],
    };
  }
}
