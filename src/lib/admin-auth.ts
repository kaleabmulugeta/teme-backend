import type { Request, Response, NextFunction } from "express";
import { allowedAdminEmails } from "../config/env.js";
import { supabaseService } from "./supabase.js";

export type AdminRequest = Request & {
    adminUserEmail?: string;
};

export const requireAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization ?? "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return res.status(401).json({ error: "Missing bearer token." });
    }

    const { data, error } = await supabaseService.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: "Invalid or expired token." });
    }

    const email = data.user.email?.toLowerCase() ?? "";

    if (!email || !allowedAdminEmails.includes(email)) {
        return res.status(403).json({ error: "This user is not allowed to access admin APIs." });
    }

    req.adminUserEmail = email;
    next();
};
