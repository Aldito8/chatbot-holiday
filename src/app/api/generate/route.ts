import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

type Recommendation = {
    nama_tempat: string;
    deskripsi: string;
    lokasi: string;
};

const isValidRecommendation = (item: Recommendation): boolean => {
    return (
        typeof item.nama_tempat === 'string' &&
        typeof item.deskripsi === 'string' &&
        typeof item.lokasi === 'string'
    );
};

export async function POST(req: NextRequest) {
    try {
        const { prompt, location, image } = await req.json();

        if (!prompt && !image) {
            return NextResponse.json({ error: "Harus ada prompt atau image" }, { status: 400 });
        }

        const fullPrompt = `
        Anda adalah seorang pakar perjalanan yang sangat detail.
        Berikan saya 3 rekomendasi tempat liburan yang sesuai dengan deskripsi dan/atau gambar yang diberikan.
        Lokasi prioritas adalah ${location || "Indonesia"}.
        
        Aturan:
        1. Jika deskripsi atau gambar tidak relevan (misalnya 'lorem ipsum', teks acak, atau gambar yang tidak berhubungan dengan travel), kembalikan pesan error dalam format JSON berisi objek dengan properti { "error": "Pesan error di sini" }.
        2. Penting: Jika lokasi diberikan dan lokasi tidak ditemukan di google maps atau lokasi adalah lokasi fiksi tau fiktif, maka kembalikan pesan error dalam format JSON berisi objek dengan properti {"error": "Lokasi yang anda maksud tidak ditemukan"}.
        3. Analisis deskripsi untuk memahami suasana, jenis pemandangan, dan aktivitas yang diinginkan.
        4. Analisis gambar jika diberikan, untuk mendapatkan petunjuk visual, jika gambar yang diberikan tidak sesuai dengan suasana liburan maka tampilkan pesan error dalam format JSON berisi objek dengan properti {"error": "Gambar yang anda maksukkan tidak sesuai dengan konsep wisata"}.

        ${prompt ? `Deskripsi: "${prompt}"` : ""}
        ${image ? `Gambar juga diberikan untuk dianalisis.` : ""}
        
        Berikan jawaban HANYA dalam format JSON array berisi objek dengan properti:
        - "nama_tempat": string
        - "deskripsi": string (maks 30 kata)
        - "lokasi": string
        `;

        let result;
        if (image) {
            const base64Data = image.split(",")[1];
            const mimeType = image.match(/data:(.*?);base64/)?.[1] || "image/png";

            result = await model.generateContent([
                { text: fullPrompt },
                {
                    inlineData: {
                        data: base64Data,
                        mimeType,
                    },
                },
            ]);
        } else {
            result = await model.generateContent(fullPrompt);
        }

        const responseText = result.response.text();
        try {
            const jsonString = responseText.replace(/```json|```/g, "").trim();
            const parsedData = JSON.parse(jsonString);

            if (Array.isArray(parsedData) && parsedData.every(isValidRecommendation)) {
                return NextResponse.json({ recommendations: parsedData });
            } else {
                return NextResponse.json({ fallback: `${jsonString}` });
            }
        } catch {
            return NextResponse.json({ fallback: responseText });
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Gagal berkomunikasi dengan Gemini AI" },
            { status: 500 }
        );
    }
}