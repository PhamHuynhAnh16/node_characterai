import fs from "fs";
import path from "path";

interface UploadResponse {
    status: string;
    value?: string;
}

export type UploadInput = string | Blob | Buffer;

async function resolveToBlob(input: UploadInput): Promise<{ blob: Blob; filename: string }> {
    if (input instanceof Blob) {
        return { blob: input, filename: "image.jpg" };
    }

    if (Buffer.isBuffer(input)) {
        const uint8 = new Uint8Array(input);
        const blob = new Blob([uint8]);
        return { blob, filename: "image.jpg" };
    }

    if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
            const res = await fetch(input);
            if (!res.ok) throw new Error("Unable to load image from URL");

            const blob = await res.blob();
            const filename = path.basename(new URL(input).pathname) || "image.jpg";
            return { blob, filename };
        }

        if (fs.existsSync(input)) {
            const buffer = await fs.promises.readFile(input);
            const uint8 = new Uint8Array(buffer);
            const blob = new Blob([uint8]);
            const filename = path.basename(input);
            return { blob, filename };
        }

        throw new Error("Input is not a valid URL or path");
    }

    throw new Error("Input type not supported");
}

export async function uploadImage(token: string, input: UploadInput): Promise<string | null> {
    const { blob, filename } = await resolveToBlob(input);

    const formData = new FormData();
    formData.append("image", blob, filename);

    try {
        const response: Response = await fetch(
            "https://neo.character.ai/image/upload_private_image",
            {
                method: "POST",
                headers: {
                    Authorization: `Token ${token as string}`,
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Origin: "https://character.ai",
                    Referer: "https://character.ai/",
                },
                body: formData,
            }
        );

        if (!response.ok) {
            console.error("HTTP error:", response.status);
            return null;
        }

        const data: UploadResponse = await response.json();

        if (data.status === "OK" && data.value) {
            return data.value;
        } else {
            console.error("The return status is incorrect.");
            return null;
        }
    } catch (error) {
        console.error("Connection error:", error);
        return null;
    }
}