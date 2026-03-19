import { Router } from "express";
import { supabaseAnon } from "../lib/supabase.js";
import { mapProjectRows } from "../lib/gallery-map.js";
export const galleryRouter = Router();
galleryRouter.get("/gallery/projects", async (_req, res) => {
    const { data, error } = await supabaseAnon
        .from("gallery_projects")
        .select("id,title_en,title_am,thumbnail_url,thumbnail_storage_path,created_at,gallery_project_images(id,image_url,storage_path,created_at)")
        .order("created_at", { ascending: false })
        .order("created_at", { referencedTable: "gallery_project_images", ascending: true });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    const projects = mapProjectRows(data);
    return res.status(200).json({ projects });
});
