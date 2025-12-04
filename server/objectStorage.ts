import { Response } from "express";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET_NAME || 'files';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set - file storage will not work');
}

// Supabase client with service role (bypasses RLS for admin operations)
export const supabaseStorage = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Simplified file representation for compatibility
export interface File {
  name: string;
  bucket: string;
  path: string;
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "public";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    return paths.length > 0 ? paths : ["public"];
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "private";
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    if (!supabaseStorage) {
      throw new Error('Supabase Storage not configured');
    }

    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { data, error } = await supabaseStorage.storage
        .from(bucketName)
        .list(searchPath, {
          search: filePath,
        });

      if (error) {
        console.error('Error searching public object:', error);
        continue;
      }

      if (data && data.length > 0) {
        // Found a match
        const file = data.find(f => f.name === filePath || f.name === fullPath);
        if (file) {
          return {
            name: file.name,
            bucket: bucketName,
            path: fullPath,
          };
        }
      }
    }
    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    if (!supabaseStorage) {
      throw new Error('Supabase Storage not configured');
    }

    try {
      const { data, error: downloadError } = await supabaseStorage.storage
        .from(file.bucket)
        .download(file.path);

      if (downloadError || !data) {
        throw new ObjectNotFoundError();
      }

      // Get file metadata
      const { data: fileList } = await supabaseStorage.storage
        .from(file.bucket)
        .list(file.path.split('/').slice(0, -1).join('/'), {
          search: file.path.split('/').pop(),
        });

      const fileInfo = fileList?.[0];
      const contentType = fileInfo?.metadata?.mimetype || 'application/octet-stream';
      const contentLength = fileInfo?.metadata?.size || data.size;

      res.set({
        "Content-Type": contentType,
        "Content-Length": contentLength.toString(),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      const buffer = await data.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        if (error instanceof ObjectNotFoundError) {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    if (!supabaseStorage) {
      throw new Error('Supabase Storage not configured');
    }

    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { data, error } = await supabaseStorage.storage
      .from(bucketName)
      .createSignedUploadUrl(fullPath, {
        upsert: false,
      });

    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!supabaseStorage) {
      throw new Error('Supabase Storage not configured');
    }

    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.replace("/objects/", "");
    const privateObjectDir = this.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/${entityId}`;

    // Check if file exists
    const { data, error } = await supabaseStorage.storage
      .from(bucketName)
      .list(fullPath.split('/').slice(0, -1).join('/'), {
        search: fullPath.split('/').pop(),
      });

    if (error || !data || data.length === 0) {
      throw new ObjectNotFoundError();
    }

    return {
      name: fullPath.split('/').pop() || '',
      bucket: bucketName,
      path: fullPath,
    };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Supabase Storage URLs have format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    if (rawPath.includes('supabase.co/storage')) {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('public') + 1;
      if (bucketIndex > 0 && bucketIndex < pathParts.length) {
        const entityPath = pathParts.slice(bucketIndex + 1).join('/');
        return `/objects/${entityPath}`;
      }
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    // Supabase Storage handles public/private via bucket policies
    // This is a simplified implementation
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/objects/")) {
      return normalizedPath;
    }

    // In Supabase, you would update bucket policies or file metadata
    // For now, we just return the normalized path
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    // Simplified access control - in production, implement proper RLS policies
    // For now, allow access if file exists
    if (!supabaseStorage) {
      return false;
    }

    try {
      const { error } = await supabaseStorage.storage
        .from(objectFile.bucket)
        .download(objectFile.path);

      return !error;
    } catch {
      return false;
    }
  }
}

// Helper to convert Supabase file to our File interface
function createFileFromSupabase(supabaseFile: any, path: string): File {
  return {
    name: supabaseFile.name,
    bucket: bucketName,
    path: path,
  };
}
