import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { env } from "../config/env.js";
import { mapProjectRows, type ProjectRow } from "../lib/gallery-map.js";
import { requireAdmin, type AdminRequest } from "../lib/admin-auth.js";
import { supabaseService } from "../lib/supabase.js";

const adminGalleryRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: env.MAX_UPLOAD_MB * 1024 * 1024
    }
});

const createSchema = z.object({
    titleEn: z.string().trim().min(1),
    titleAm: z.string().trim().min(1)
});

const updateSchema = z.object({
    titleEn: z.string().trim().min(1),
    titleAm: z.string().trim().min(1)
});

const sanitize = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "project";

const IMAGE_VARIANTS = [
    { name: "low", width: 480, quality: 58 },
    { name: "mid", width: 960, quality: 72 },
    { name: "high", width: 1920, quality: 84 }
] as const;

const isVariantHighPath = (path: string) => path.includes("-high.webp");

const expandVariantPaths = (path: string) => {
    if (!isVariantHighPath(path)) {
        return [path];
    }

    return [
        path.replace("-high.webp", "-low.webp"),
        path.replace("-high.webp", "-mid.webp"),
        path
    ];
};

adminGalleryRouter.get("/admin/gallery/projects", requireAdmin, async (_req, res) => {
    const { data, error } = await supabaseService
        .from("gallery_projects")
        .select(
            "id,title_en,title_am,thumbnail_url,thumbnail_storage_path,created_at,gallery_project_images(id,image_url,storage_path,created_at)"
        )
        .order("created_at", { ascending: false })
        .order("created_at", { referencedTable: "gallery_project_images", ascending: true });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ projects: mapProjectRows(data as ProjectRow[]) });
});

adminGalleryRouter.post(
    "/admin/gallery/projects",
    requireAdmin,
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 20 }
    ]),
    async (req: AdminRequest, res) => {
        const parsed = createSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid title fields." });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const thumbnail = files?.thumbnail?.[0];
        const extras = files?.images ?? [];

        if (!thumbnail) {
            return res.status(400).json({ error: "Thumbnail image is required." });
        }

        const uploadedPaths: string[] = [];
        let createdProjectId: string | null = null;

        try {
            const folder = `${sanitize(parsed.data.titleEn)}-${Date.now()}-${Math.round(Math.random() * 100000)}`;

            const uploadFileVariants = async (file: Express.Multer.File, role: "thumb" | "image", index: number) => {
                const basePath = `${folder}/${role}-${index}-${crypto.randomUUID()}`;
                const uploaded: Record<(typeof IMAGE_VARIANTS)[number]["name"], { path: string; url: string }> = {
                    low: { path: "", url: "" },
                    mid: { path: "", url: "" },
                    high: { path: "", url: "" }
                };

                for (const variant of IMAGE_VARIANTS) {
                    const buffer = await sharp(file.buffer)
                        .rotate()
                        .resize({ width: variant.width, withoutEnlargement: true })
                        .webp({ quality: variant.quality })
                        .toBuffer();

                    const path = `${basePath}-${variant.name}.webp`;

                    const { error } = await supabaseService.storage
                        .from(env.SUPABASE_GALLERY_BUCKET)
                        .upload(path, buffer, {
                            contentType: "image/webp",
                            upsert: false
                        });

                    if (error) {
                        throw new Error(error.message);
                    }

                    uploadedPaths.push(path);
                    const { data } = supabaseService.storage.from(env.SUPABASE_GALLERY_BUCKET).getPublicUrl(path);
                    uploaded[variant.name] = { path, url: data.publicUrl };
                }

                return uploaded;
            };

            const thumbnailUploaded = await uploadFileVariants(thumbnail, "thumb", 0);
            const extraUploads: Array<{ path: string; url: string }> = [];

            for (let index = 0; index < extras.length; index += 1) {
                const uploaded = await uploadFileVariants(extras[index], "image", index + 1);
                extraUploads.push(uploaded.high);
            }

            const { data: createdProject, error: createError } = await supabaseService
                .from("gallery_projects")
                .insert({
                    title_en: parsed.data.titleEn,
                    title_am: parsed.data.titleAm,
                    thumbnail_url: thumbnailUploaded.high.url,
                    thumbnail_storage_path: thumbnailUploaded.high.path
                })
                .select("id")
                .single();

            if (createError || !createdProject) {
                throw new Error(createError?.message ?? "Could not create project.");
            }

            createdProjectId = createdProject.id;

            if (extraUploads.length > 0) {
                const { error: extraInsertError } = await supabaseService.from("gallery_project_images").insert(
                    extraUploads.map((image) => ({
                        project_id: createdProject.id,
                        image_url: image.url,
                        storage_path: image.path
                    }))
                );

                if (extraInsertError) {
                    throw new Error(extraInsertError.message);
                }
            }

            return res.status(201).json({ success: true, projectId: createdProject.id });
        } catch (error) {
            if (createdProjectId) {
                await supabaseService.from("gallery_projects").delete().eq("id", createdProjectId);
            }

            if (uploadedPaths.length > 0) {
                await supabaseService.storage.from(env.SUPABASE_GALLERY_BUCKET).remove(uploadedPaths);
            }

            return res.status(500).json({ error: error instanceof Error ? error.message : "Upload failed." });
        }
    }
);

adminGalleryRouter.patch("/admin/gallery/projects/:projectId", requireAdmin, async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid title fields." });
    }

    const { projectId } = req.params;

    const { error } = await supabaseService
        .from("gallery_projects")
        .update({
            title_en: parsed.data.titleEn,
            title_am: parsed.data.titleAm
        })
        .eq("id", projectId);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
});

adminGalleryRouter.delete("/admin/gallery/projects/:projectId", requireAdmin, async (req, res) => {
    const { projectId } = req.params;

    const { data: project, error: findError } = await supabaseService
        .from("gallery_projects")
        .select("thumbnail_storage_path,gallery_project_images(storage_path)")
        .eq("id", projectId)
        .single();

    if (findError || !project) {
        return res.status(404).json({ error: "Project not found." });
    }

    const pathsToDelete = [
        project.thumbnail_storage_path,
        ...((project.gallery_project_images ?? []).map((img) => img.storage_path) ?? [])
    ]
        .flatMap((path) => expandVariantPaths(path))
        .filter(Boolean);

    const { error: deleteError } = await supabaseService.from("gallery_projects").delete().eq("id", projectId);

    if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
    }

    if (pathsToDelete.length > 0) {
        await supabaseService.storage.from(env.SUPABASE_GALLERY_BUCKET).remove(pathsToDelete);
    }

    return res.status(200).json({ success: true });
});

export { adminGalleryRouter };
