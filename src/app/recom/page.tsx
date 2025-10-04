'use client';

import { Upload, X, Compass, MapPin, ServerCrash } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image'; 

type HolidayDestination = {
    nama_tempat: string;
    deskripsi: string;
    lokasi: string;
};

type FallbackMessage = {
    error: string;
};

export default function Recommendation() {
    const [prompt, setPrompt] = useState('');
    const [location, setLocation] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [destinations, setDestinations] = useState<HolidayDestination[]>([]);
    const [fallbackMessage, setFallbackMessage] = useState<FallbackMessage | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const createMapUrl = (name: string, location: string) => {
        const query = encodeURIComponent(`${name}, ${location}`);
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!prompt && !imageFile) return;

        setLoading(true);
        setError(null);
        setDestinations([]);
        setFallbackMessage(null);
        setHasSearched(true);

        try {
            const body: { prompt: string; location: string; image?: string } = { prompt, location };
            if (preview) {
                body.image = preview;
            }
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mendapatkan respon dari server.');

            if (data.recommendations) setDestinations(data.recommendations);
            else if (data.fallback) setFallbackMessage(JSON.parse(data.fallback));
            else if (data.error) setError(data.error);
            else setError("Format respons dari server tidak dikenali.");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Terjadi kesalahan. Coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-gray-900 text-white p-4 sm:p-8">
            <div className="w-full max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">
                        AIWanna
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Rencanakan petualangan Anda berikutnya</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl mb-10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Saya ingin liburan ke pantai yang tenang di Indonesia, budget sedang, untuk honeymoon..."
                            className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 placeholder:text-slate-500"
                            rows={4}
                        />

                        {preview ? (
                            <div className="relative group w-full h-60">
                                <Image
                                    src={preview}
                                    alt="Preview"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    className="rounded-lg"
                                />
                                <button onClick={handleRemoveImage} type="button" className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 z-10">
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <label htmlFor="image-upload" className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 p-6 rounded-lg w-full cursor-pointer">
                                <Upload size={32} className="text-slate-400 mb-2" />
                                <span className="text-sm font-semibold text-slate-300">Unggah Gambar Inspirasi</span>
                                <span className="text-xs text-slate-500 mt-1">Opsional</span>
                            </label>
                        )}
                        <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                        <input
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Prioritas Lokasi (contoh: Bali)"
                            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 placeholder:text-slate-500"
                        />

                        <button type="submit" disabled={loading || (!prompt && !imageFile)} className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-lg rounded-lg shadow-lg disabled:bg-slate-600 disabled:from-slate-600 disabled:cursor-not-allowed">
                            {loading ? 'Menganalisis...' : 'Cari Rekomendasi'}
                        </button>
                    </form>
                </div>

                <div className="w-full space-y-6">
                    {loading && (
                        <div className="text-center p-8 text-slate-400">
                            <p>Mencari rekomendasi terbaik untuk Anda...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center text-center p-6 bg-red-900/30 text-red-300 border border-red-700 rounded-lg">
                            <ServerCrash size={32} className="mb-2" />
                            <strong className="font-semibold">Terjadi Kesalahan:</strong>
                            <p>{error}</p>
                        </div>
                    )}

                    {hasSearched && !loading && !error && destinations.length === 0 && !fallbackMessage && (
                        <div className="flex flex-col items-center text-center p-8 bg-slate-800/50 rounded-2xl">
                            <Compass size={48} className="mx-auto text-slate-500 mb-4" />
                            <h3 className="text-xl font-semibold text-white">Tidak Ada Hasil</h3>
                            <p className="text-slate-400 mt-2">Coba ubah deskripsi pencarian Anda untuk hasil yang lebih baik.</p>
                        </div>
                    )}

                    {fallbackMessage && (
                        <div className="p-6 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-300 text-center pb-4">Pesan dari AI</h3>
                            <pre className="whitespace-pre-wrap text-left bg-black/20 p-4 rounded-md font-mono text-sm text-slate-300">{fallbackMessage.error}</pre>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {destinations.map((dest, index) => (
                            <div key={index} className="bg-gradient-to-br from-slate-800 to-slate-800/30 border border-slate-700 rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-cyan-300">{dest.nama_tempat}</h3>
                                <div className="flex items-center text-sm text-slate-400 font-medium my-2">
                                    <MapPin size={14} className="mr-2" />
                                    <span>{dest.lokasi}</span>
                                </div>
                                <p className="text-slate-300 mb-4 text-sm leading-relaxed">{dest.deskripsi}</p>
                                <a href={createMapUrl(dest.nama_tempat, dest.lokasi)} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-md">
                                    Lihat di Google Maps
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}