const getVariantStoragePaths = (storagePath) => {
    if (!storagePath.includes("-high.webp")) {
        return {
            low: storagePath,
            mid: storagePath,
            high: storagePath
        };
    }
    return {
        low: storagePath.replace("-high.webp", "-low.webp"),
        mid: storagePath.replace("-high.webp", "-mid.webp"),
        high: storagePath
    };
};
const toPublicUrl = (currentUrl, currentPath, targetPath) => {
    if (currentPath === targetPath) {
        return currentUrl;
    }
    return currentUrl.replace(currentPath, targetPath);
};
const mapImage = (image) => {
    const paths = getVariantStoragePaths(image.storage_path);
    return {
        id: image.id,
        imageUrl: image.image_url,
        lowResUrl: toPublicUrl(image.image_url, image.storage_path, paths.low),
        midResUrl: toPublicUrl(image.image_url, image.storage_path, paths.mid),
        highResUrl: toPublicUrl(image.image_url, image.storage_path, paths.high),
        storagePath: image.storage_path,
        lowResStoragePath: paths.low,
        midResStoragePath: paths.mid,
        highResStoragePath: paths.high,
        createdAt: image.created_at
    };
};
export const mapProjectRows = (rows) => rows.map((project) => {
    const thumbnail = mapImage({
        id: `${project.id}-thumbnail`,
        image_url: project.thumbnail_url,
        storage_path: project.thumbnail_storage_path,
        created_at: project.created_at
    });
    return {
        id: project.id,
        titleEn: project.title_en,
        titleAm: project.title_am,
        thumbnailUrl: project.thumbnail_url,
        thumbnailLowResUrl: thumbnail.lowResUrl,
        thumbnailMidResUrl: thumbnail.midResUrl,
        thumbnailHighResUrl: thumbnail.highResUrl,
        thumbnailStoragePath: project.thumbnail_storage_path,
        thumbnailLowResStoragePath: thumbnail.lowResStoragePath,
        thumbnailMidResStoragePath: thumbnail.midResStoragePath,
        thumbnailHighResStoragePath: thumbnail.highResStoragePath,
        createdAt: project.created_at,
        images: [
            thumbnail,
            ...((project.gallery_project_images ?? []).map((image) => mapImage(image)) ?? [])
        ]
    };
});
