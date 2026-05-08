import { parseDatabaseUrl, detectCloudProvider } from "./db-url-parser";

describe("db-url-parser", () => {
  describe("detectCloudProvider", () => {
    it("should detect Supabase URLs", () => {
      const result = detectCloudProvider("postgresql://postgres:password@db.xyz.supabase.co:5432/postgres");
      expect(result?.name).toBe("Supabase");
    });

    it("should detect Neon URLs", () => {
      const result = detectCloudProvider("postgres://user:pass@ep-cool-ice-123.us-east-2.aws.neon.tech/neondb");
      expect(result?.name).toBe("Neon DB");
    });

    it("should detect MongoDB Atlas URLs", () => {
      const result = detectCloudProvider("mongodb+srv://admin:pass@cluster0.abc.mongodb.net/test");
      expect(result?.name).toBe("MongoDB Atlas");
    });

    it("should return null for unknown hosts", () => {
      const result = detectCloudProvider("postgres://localhost:5432/mydb");
      expect(result).toBeNull();
    });
  });

  describe("parseDatabaseUrl", () => {
    it("should parse a standard PostgreSQL URL", () => {
      const url = "postgresql://john:secret@localhost:5432/mydb";
      const result = parseDatabaseUrl(url);
      
      expect(result.type).toBe("postgres");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(5432);
      expect(result.user).toBe("john");
      expect(result.password).toBe("secret");
      expect(result.database).toBe("mydb");
      expect(result.ssl).toBe(false);
    });

    it("should parse a standard MySQL URL", () => {
      const url = "mysql://root:rootpass@127.0.0.1:3306/production_db";
      const result = parseDatabaseUrl(url);
      
      expect(result.type).toBe("mysql");
      expect(result.host).toBe("127.0.0.1");
      expect(result.port).toBe(3306);
      expect(result.user).toBe("root");
      expect(result.database).toBe("production_db");
    });

    it("should parse a MongoDB+SRV URL", () => {
      const url = "mongodb+srv://user:pass@cluster.mongodb.net/my_app";
      const result = parseDatabaseUrl(url);
      
      expect(result.type).toBe("mongodb");
      expect(result.host).toBe("cluster.mongodb.net");
      expect(result.database).toBe("my_app");
      expect(result.ssl).toBe(true);
    });

    it("should handle encoded characters in username and password", () => {
      const url = "postgres://user%40gmail.com:p%40ss%23word@host.com/db";
      const result = parseDatabaseUrl(url);
      
      expect(result.user).toBe("user@gmail.com");
      expect(result.password).toBe("p@ss#word");
    });

    it("should auto-enable SSL for cloud providers", () => {
      const url = "postgres://user:pass@db.neon.tech/neondb";
      const result = parseDatabaseUrl(url);
      expect(result.ssl).toBe(true);
    });

    it("should enable SSL when sslmode=require is present", () => {
      const url = "postgres://user:pass@localhost/db?sslmode=require";
      const result = parseDatabaseUrl(url);
      expect(result.ssl).toBe(true);
    });

    it("should throw an error for unsupported protocols", () => {
      expect(() => parseDatabaseUrl("sqlite://path/to/db")).toThrow(/Unsupported database URL protocol/);
    });

    it("should throw an error for invalid formats", () => {
      expect(() => parseDatabaseUrl("postgres://invalid-url")).toThrow(/is missing the database name/);
    });
  });
});
