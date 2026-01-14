import React, { useState, useEffect, useRef } from 'react';
import { uploadPDF, getAudioUrl, getPageImageUrl, getDocStatus, getVoices, getLibrary, deleteBook } from './api';
import { Upload, Play, Pause, ChevronLeft, ChevronRight, Loader2, FileText, Trash2, Home } from 'lucide-react';
import './BookStyles.css';

function App() {
    const [docId, setDocId] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("es-AR-TomasNeural");
    const [library, setLibrary] = useState([]);
    const [showLibrary, setShowLibrary] = useState(true);
    const audioRef = useRef(null);
    const autoAdvanceRef = useRef(false);

    // Fetch voices
    useEffect(() => {
        getVoices().then(setVoices).catch(console.error);
        getLibrary().then(setLibrary).catch(console.error);
    }, []);

    // Update audio playback rate when state changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    // Re-construct audio URL when voice changes (if playing)
    useEffect(() => {
        if (docId && audioRef.current) {
            const currentSrc = audioRef.current.src;
            // Only update if src changed to avoid reload loop
            if (!currentSrc.includes(selectedVoice)) {
                // Optimization: handled by main effect if docId/page/voice causes prop change?
                // Actually we need to force reload if voice changes but page hasn't.
                // The next effect handles [selectedVoice] dependency too.
            }
        }
    }, [selectedVoice]);

    useEffect(() => {
        if (docId && audioRef.current) {
            audioRef.current.src = getAudioUrl(docId, currentPage, selectedVoice);
            if (audioRef.current) {
                audioRef.current.playbackRate = playbackRate;
            }

            // Should we play? Yes if we were playing, OR if we just auto-advanced.
            if (isPlaying || autoAdvanceRef.current) {
                console.log(`Auto-playing page ${currentPage} (Auto-advance: ${autoAdvanceRef.current})`);

                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsPlaying(true);
                            // Important: Reset the ref AFTER we successfully start playing
                            autoAdvanceRef.current = false;
                        })
                        .catch(e => {
                            console.log("Autoplay prevented/failed", e);
                            setIsPlaying(false);
                            autoAdvanceRef.current = false;
                        });
                }
            }
        }
    }, [docId, currentPage, selectedVoice]);

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const initData = await uploadPDF(file);
            const docId = initData.doc_id;

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusData = await getDocStatus(docId);
                    if (statusData.status === 'ready') {
                        clearInterval(pollInterval);
                        setDocId(docId);
                        setTotalPages(statusData.total_pages);
                        setCurrentPage(1);
                        setIsUploading(false);
                    } else if (statusData.status === 'error') {
                        clearInterval(pollInterval);
                        setIsUploading(false);
                        alert(`Error processing PDF: ${statusData.error}`);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);

        } catch (error) {
            console.error("Upload failed", error);
            alert("Error uploading file");
            setIsUploading(false);
        }
    };

    const handleSelectBook = (book) => {
        setDocId(book.doc_id);
        setTotalPages(book.total_pages || 0);
        setCurrentPage(1);
    };

    const handleDeleteBook = async (e, bookId) => {
        e.stopPropagation(); // Prevent selection
        if (!window.confirm("¿Seguro que quieres eliminar este libro?")) return;

        try {
            await deleteBook(bookId);
            setLibrary(prev => prev.filter(b => b.doc_id !== bookId));
            // If we deleted the current book, go back to upload
            if (docId === bookId) {
                setDocId(null);
            }
            alert("Libro eliminado de la biblioteca.");
        } catch (error) {
            console.error("Failed to delete book", error);
            alert("Error al eliminar el libro");
        }
    };

    const handleAudioEnded = () => {
        console.log("Audio ended. Current:", currentPage, "Total:", totalPages);
        if (currentPage < totalPages) {
            console.log("Advancing to next page...");
            autoAdvanceRef.current = true;
            setCurrentPage(p => p + 1);
        } else {
            console.log("End of book.");
            setIsPlaying(false);
        }
    };


    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white font-sans">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
                <div className="w-10">
                    {/* Placeholder or Back button if reading */}
                    {docId && (
                        <button
                            onClick={() => setDocId(null)}
                            title="Volver a la biblioteca"
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <Home className="w-6 h-6 text-blue-400" />
                        </button>
                    )}
                </div>

                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-500 animate-fade-in-down select-none">
                    Amori
                </h1>

                <div className="w-10">
                    {/* Placeholder for future menu or settings */}
                </div>
            </header>

            <div className="p-8 pt-4 max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <p className="text-lg text-gray-300">Transforma tus PDFs en audiolibros con voz neuronal y OCR.</p>
                </div>

                {!docId ? (<>
                    <div className="upload-container backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-12 text-center shadow-2xl transition-all hover:bg-white/15">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                            <div className="p-6 bg-blue-500/20 rounded-full border border-blue-400/30">
                                {isUploading ? <Loader2 className="w-16 h-16 text-blue-400 animate-spin" /> : <Upload className="w-16 h-16 text-blue-400" />}
                            </div>
                            <span className="text-2xl font-semibold text-white">
                                {isUploading ? "Procesando..." : "Sube tu PDF aquí"}
                            </span>
                            <p className="text-gray-400">Soporta texto e imágenes (OCR)</p>
                        </label>
                    </div>

                    {library.length > 0 && (
                        <div className="mt-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <h2 className="text-2xl font-bold text-white text-center">Tu Biblioteca</h2>
                                <button
                                    onClick={() => setShowLibrary(!showLibrary)}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-gray-400 hover:text-white transition-colors border border-white/10"
                                >
                                    {showLibrary ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>

                            {showLibrary && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
                                    {library.map(book => (
                                        <div
                                            key={book.doc_id}
                                            // Dimensions adjusted to roughly A5 (Half A4) aspect ratio and scale
                                            // A5 is 148mm x 210mm.
                                            // Using ~300px width and ~425px height maintains the ~1.41 aspect ratio.
                                            style={{ width: '300px', height: '425px' }}
                                            className="group relative flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all shadow-lg hover:shadow-xl overflow-hidden"
                                            title={book.filename}
                                        >

                                            {/* Preview/Icon Area */}
                                            <div className="relative w-full flex-1 flex items-center justify-center rounded-xl overflow-hidden mb-2 bg-black/20 group-hover:scale-105 transition-transform duration-300">
                                                <FileText className="w-16 h-16 text-blue-400/50" />

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                    <button
                                                        onClick={() => handleSelectBook(book)}
                                                        className="p-3 bg-blue-500 hover:bg-blue-400 rounded-full text-white shadow-lg hover:scale-110 transition-all transform"
                                                    >
                                                        <Play className="w-8 h-8 fill-current ml-1" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <span className="text-sm text-gray-300 font-medium truncate w-full text-center px-1">
                                                {book.filename.replace('.pdf', '')}
                                            </span>

                                            {/* Top Metadata / Delete - Moved to end for stacking order safety */}
                                            <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        console.log("Delete clicked for", book.doc_id);
                                                        handleDeleteBook(e, book.doc_id);
                                                    }}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400 hover:text-red-200 transition-colors"
                                                    title="Eliminar libro"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
                ) : (
                    <div className="player-container backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-8">
                        {/* Book Viewer */}
                        <div className={`book-container ${currentPage === 1 ? 'single-page-view' : ''}`}>
                            <div className="book-spread">
                                {/* Spine Effect */}
                                {currentPage > 1 && <div className="book-spine"></div>}

                                {currentPage === 1 ? (
                                    // Cover Page (Page 1)
                                    <div className="book-page">
                                        <img
                                            src={getPageImageUrl(docId, 1)}
                                            alt="Cover Page"
                                            className="page-image"
                                        />
                                        <div className="active-reading-indicator"></div>
                                        <span className="page-number">1</span>
                                    </div>
                                ) : (
                                    // Two Page Spread
                                    <>
                                        {/* Left Page (Even) */}
                                        <div className="book-page page-left">
                                            {/* Logic: If current is even (e.g. 2), left is 2. If current is odd (e.g. 3), left is 2. */}
                                            {(() => {
                                                const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
                                                return (
                                                    <>
                                                        <img
                                                            src={getPageImageUrl(docId, leftPageNum)}
                                                            alt={`Page ${leftPageNum}`}
                                                            className="page-image"
                                                        />
                                                        {currentPage === leftPageNum && <div className="active-reading-indicator"></div>}
                                                        <span className="page-number">{leftPageNum}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Right Page (Odd) */}
                                        <div className="book-page page-right">
                                            {(() => {
                                                const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
                                                const rightPageNum = leftPageNum + 1;

                                                if (rightPageNum > totalPages) return <div className="flex items-center justify-center h-full text-gray-400">Fin del libro</div>;

                                                return (
                                                    <>
                                                        <img
                                                            src={getPageImageUrl(docId, rightPageNum)}
                                                            alt={`Page ${rightPageNum}`}
                                                            className="page-image"
                                                        />
                                                        {currentPage === rightPageNum && <div className="active-reading-indicator"></div>}
                                                        <span className="page-number">{rightPageNum}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="controls flex flex-col items-center gap-4">
                            <div className="flex items-center gap-8">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>

                                <button
                                    onClick={togglePlay}
                                    className="p-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 hover:scale-110 transition-transform shadow-lg shadow-purple-500/30"
                                >
                                    {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                                </button>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="flex flex-wrap justify-center items-center gap-6 mt-2">
                                <span className="text-gray-400 text-sm">Página {currentPage} de {totalPages}</span>

                                <div className="h-4 w-px bg-white/20 hidden sm:block"></div>

                                {/* Speed Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">Vel:</span>
                                    <select
                                        value={playbackRate}
                                        onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                        className="bg-black/20 border border-white/10 rounded-md px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="0.5">0.5x</option>
                                        <option value="0.75">0.75x</option>
                                        <option value="1">1x</option>
                                        <option value="1.25">1.25x</option>
                                        <option value="1.5">1.5x</option>
                                        <option value="2">2x</option>
                                    </select>
                                </div>

                                <div className="h-4 w-px bg-white/20 hidden sm:block"></div>

                                {/* Voice Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">Voz:</span>
                                    <select
                                        value={selectedVoice}
                                        onChange={(e) => setSelectedVoice(e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded-md px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500 max-w-[150px] truncate cursor-pointer"
                                    >
                                        {voices.map(v => (
                                            <option key={v.ShortName} value={v.ShortName}>
                                                {v.FriendlyName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="w-full">
                            <audio
                                ref={audioRef}
                                onEnded={handleAudioEnded}
                                onPlay={onPlay}
                                onPause={onPause}
                                controls
                                className="w-full opacity-70 hover:opacity-100 transition-opacity"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}

export default App
