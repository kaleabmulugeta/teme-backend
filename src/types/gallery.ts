export type GalleryImage = {
    id: string;
    imageUrl: string;
    lowResUrl: string;
    midResUrl: string;
    highResUrl: string;
    storagePath: string;
    lowResStoragePath: string;
    midResStoragePath: string;
    highResStoragePath: string;
    createdAt: string;
};

export type GalleryProject = {
    id: string;
    titleEn: string;
    titleAm: string;
    thumbnailUrl: string;
    thumbnailLowResUrl: string;
    thumbnailMidResUrl: string;
    thumbnailHighResUrl: string;
    thumbnailStoragePath: string;
    thumbnailLowResStoragePath: string;
    thumbnailMidResStoragePath: string;
    thumbnailHighResStoragePath: string;
    createdAt: string;
    images: GalleryImage[];
};
