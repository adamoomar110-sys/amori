import React, { useState, useEffect, useRef } from 'react';
import { uploadPDF, getAudioUrl, getPageImageUrl, getDocStatus, getVoices, getLibrary, deleteBook, updateProgress } from './api';
import { Upload, Play, Pause, ChevronLeft, ChevronRight, Loader2, FileText, Trash2, Home, Square, Search, Cat, Dog, Leaf, Languages } from 'lucide-react';
import './BookStyles.css';

import { themes } from './themeConfig';
import FlipBook from './components/FlipBook';

function App() {
    const [docId, setDocId] = useState(null);

    // Initialize theme
    const [theme, setTheme] = useState('nature');

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper to calculate progress percentage
    const getProgress = (book) => {
        if (!book.total_pages || book.total_pages === 0) return 0;
        return Math.round((book.last_page / book.total_pages) * 100);
    };

    // Safety check
    const t = themes[theme] || themes.nature;

    // Save reading progress
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("es-AR-TomasNeural");
    const [jumpPage, setJumpPage] = useState("");
    const [library, setLibrary] = useState([]);
    const [showLibrary, setShowLibrary] = useState(true);
    const [isTranslated, setIsTranslated] = useState(false);

    const [layoutMode, setLayoutMode] = useState(window.innerWidth < 768 ? 'single' : 'double');

    const audioRef = useRef(null);
    const autoAdvanceRef = useRef(false);
    const flipBookRef = useRef(null);

    useEffect(() => {
        if (docId && currentPage) {
            const timer = setTimeout(() => {
                updateProgress(docId, currentPage).catch(e => console.error("Failed to save progress", e));
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [docId, currentPage]);

    useEffect(() => {
        getVoices().then(setVoices).catch(console.error);
        getLibrary().then(setLibrary).catch(console.error);
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        if (docId && audioRef.current) {
            audioRef.current.src = getAudioUrl(docId, currentPage, selectedVoice, isTranslated);
            if (audioRef.current) {
                audioRef.current.playbackRate = playbackRate;
            }

            if (isPlaying || autoAdvanceRef.current) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsPlaying(true);
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
    }, [docId, currentPage, selectedVoice, isTranslated]);

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const initData = await uploadPDF(file);
            const docId = initData.doc_id;

            const pollInterval = setInterval(async () => {
                try {
                    const statusData = await getDocStatus(docId);
                    if (statusData.status === 'ready') {
                        clearInterval(pollInterval);
                        setDocId(docId);
                        setTotalPages(statusData.total_pages);
                        setCurrentPage(statusData.last_page || 1);
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
        setCurrentPage(book.last_page || 1);
    };

    const handleDeleteBook = async (e, bookId) => {
        e.stopPropagation();
        if (!window.confirm("¿Seguro que quieres eliminar este libro?")) return;

        try {
            await deleteBook(bookId);
            setLibrary(prev => prev.filter(b => b.doc_id !== bookId));
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
        if (currentPage < totalPages) {
            autoAdvanceRef.current = true;
            // Trigger flip via ref
            if (flipBookRef.current) {
                flipBookRef.current.flipNext();
            }
        } else {
            setIsPlaying(false);
        }
    };

    useEffect(() => {
        if (docId && currentPage < totalPages) {
            const nextPage = currentPage + 1;
            const nextAudioUrl = getAudioUrl(docId, nextPage, selectedVoice, isTranslated);
            fetch(nextAudioUrl, { priority: 'low' }).catch(e => console.log("Prefetch harmless error:", e));
        }
    }, [docId, currentPage, totalPages, selectedVoice, isTranslated]);


    useEffect(() => {
        if (currentPage) setJumpPage(currentPage);
    }, [currentPage]);

    const handleJump = () => {
        const val = parseInt(jumpPage);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            if (flipBookRef.current) {
                flipBookRef.current.turnToPage(val);
            }
        } else {
            setJumpPage(currentPage);
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

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    return (
        // Added flex and flex-col to ensure footer stays at bottom
        <div className={`min-h-screen font-sans transition-colors duration-500 relative flex flex-col ${t.bg}`}>
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b p-3 shadow-lg transition-colors duration-500 relative ${t.header}`}>
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {docId && (
                            <button
                                onClick={() => setDocId(null)}
                                title="Volver a la biblioteca"
                                className={`p-2 rounded-full transition-colors ${t.buttonSecondary}`}
                            >
                                <span>Inicio</span>
                            </button>
                        )}
                        {!docId && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h1 className={`text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${t.titleGradient}`}>
                                    Amori
                                </h1>
                            </div>
                        )}
                        {/* Theme Switcher - Now visible always, but styled differently if needed */}
                        <div className="flex gap-1 ml-0 sm:ml-4">
                            {Object.values(themes).map(th => {
                                const IconComponent = { square: Square, cat: Cat, dog: Dog, leaf: Leaf }[th.icon] || Square;
                                return (
                                    <button
                                        key={th.id}
                                        onClick={() => setTheme(th.id)}
                                        className={`p-1.5 rounded-full border transition-all ${theme === th.id ? 'scale-110 shadow-md ' + t.ringColor : 'opacity-70 hover:opacity-100'} ${th.id === 'default' ? 'bg-gray-800' : th.id === 'kitten' ? 'bg-pink-300' : th.id === 'puppy' ? 'bg-amber-300' : 'bg-emerald-300'}`}
                                        title={th.label}
                                    >
                                        <span className="sr-only">{th.label}</span>
                                        {th.customIcon ? (
                                            <img
                                                src={th.customIcon}
                                                alt={th.label}
                                                className="w-5 h-5 rounded-full object-cover"
                                            />
                                        ) : (
                                            <IconComponent size={16} className={th.id === 'default' ? 'text-white' : 'text-gray-800'} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {docId && (
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
                            <div className={`flex items-center gap-2 rounded-lg p-1 border ${t.input}`}>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    className={`bg-transparent text-sm sm:text-base focus:outline-none max-w-[100px] sm:max-w-[140px] truncate cursor-pointer h-10 ${theme === 'default' ? '[&>option]:bg-gray-900' : ''}`}
                                    title="Seleccionar Voz"
                                >
                                    {voices.map(v => (
                                        <option key={v.ShortName} value={v.ShortName}>{v.FriendlyName}</option>
                                    ))}
                                </select>
                                <div className="w-px h-6 bg-current opacity-20"></div>
                                <select
                                    value={playbackRate}
                                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                    className={`bg-transparent text-sm sm:text-base focus:outline-none cursor-pointer h-10 ${theme === 'default' ? '[&>option]:bg-gray-900' : ''}`}
                                    title="Velocidad"
                                >
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                            </div>

                            <button
                                onClick={() => setIsTranslated(!isTranslated)}
                                className={`p-3 rounded-full transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center ${isTranslated ? 'bg-indigo-500 text-white shadow-lg' : t.buttonSecondary}`}
                            >
                                <span>Lang</span>
                            </button>

                            <button
                                onClick={() => setLayoutMode(m => m === 'single' ? 'double' : 'single')}
                                className={`p-3 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${t.buttonSecondary}`}
                            >
                                {layoutMode === 'single' ?
                                    <span>[1]</span> :
                                    <span>[2]</span>
                                }
                            </button>

                            <div className={`flex items-center gap-2 rounded-full p-1.5 border ${t.input}`}>
                                <button
                                    onClick={handleStop}
                                    className="p-3 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <span>Detener</span>
                                </button>

                                <button
                                    onClick={togglePlay}
                                    className={`p-3 rounded-full shadow-md transition-transform hover:scale-105 min-w-[44px] min-h-[44px] flex items-center justify-center ${t.buttonPrimary}`}
                                >
                                    {isPlaying ? <span>Pausar</span> : <span>Reproducir</span>}
                                </button>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        if (flipBookRef.current) flipBookRef.current.flipPrev();
                                    }}
                                    disabled={currentPage === 1}
                                    className={`p-2 sm:p-3 rounded-full disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center ${t.buttonSecondary}`}
                                >
                                    <span>{'<'}</span>
                                </button>


                                <div className={`flex items-center rounded-full px-3 py-1 border focus-within:border-current transition-colors h-10 ${t.input}`}>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpPage}
                                        onChange={(e) => setJumpPage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                                        className="bg-transparent text-center w-10 sm:w-12 text-base focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="#"
                                    />
                                    <button
                                        onClick={handleJump}
                                        className="p-1 hover:opacity-70 transition-opacity"
                                        title="Ir a página"
                                    >
                                        <span>Ir</span>
                                    </button>
                                </div>
                                <span className="text-gray-500 text-xs select-none ml-1">/ {totalPages}</span>

                                <button
                                    onClick={() => {
                                        if (flipBookRef.current) flipBookRef.current.flipNext();
                                    }}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 sm:p-3 rounded-full disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center ${t.buttonSecondary}`}
                                >
                                    <span>{'>'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {!docId && (
                        <div className="flex-1"></div>
                    )}
                </div>
            </header>

            <div className="p-3 sm:p-8 pt-2 sm:pt-4 max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <p className={`text-lg transition-colors ${theme === 'default' ? 'text-gray-300' : 'opacity-80'}`}>Transforma tus PDFs en audiolibros con voz neuronal y OCR.</p>
                </div>

                {!docId ? (<>
                    <div className={`upload-container backdrop-blur-lg rounded-3xl p-12 text-center shadow-2xl transition-all ${t.card}`}>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                            <div className="p-6 bg-blue-500/20 rounded-full border border-blue-400/30">
                                {isUploading ? <span>Cargando...</span> : <span>Subir</span>}
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
                                <h2 className={`text-2xl font-bold text-center ${t.headerText}`}>Tu Biblioteca</h2>
                                <button
                                    onClick={() => setShowLibrary(!showLibrary)}
                                    className={`px-3 py-1 rounded-full text-xs transition-colors border ${t.buttonSecondary}`}
                                >
                                    {showLibrary ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>

                            {showLibrary && (
                                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6 justify-items-center">
                                    {library.map(book => (
                                        <div
                                            key={book.doc_id}
                                            className={`group relative flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all shadow-lg hover:shadow-xl overflow-hidden ${t.card} w-full aspect-[3/5]`}
                                            title={book.filename}
                                        >
                                            <div className="relative w-full flex-1 flex items-center justify-center rounded-lg sm:rounded-xl overflow-hidden mb-2 bg-black/20 group-hover:scale-105 transition-transform duration-300">
                                                <span>PDF</span>

                                                {/* Progress Bar Overlay */}
                                                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-700/50">
                                                    <div
                                                        className={`h-full ${t.progressColor}`}
                                                        style={{ width: `${getProgress(book)}%` }}
                                                    ></div>
                                                </div>

                                                <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 bg-black/10 sm:bg-black/40 transition-opacity">
                                                    <button
                                                        onClick={() => handleSelectBook(book)}
                                                        className="p-3 sm:p-4 bg-blue-500 hover:bg-blue-400 rounded-full text-white shadow-lg hover:scale-110 transition-all transform flex items-center justify-center z-10"
                                                        aria-label="Play"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play ml-1"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <span className="text-xs sm:text-sm text-gray-300 font-medium truncate w-full text-center px-1">
                                                {book.filename.replace('.pdf', '')}
                                            </span>

                                            <div className="absolute top-2 right-2 z-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDeleteBook(e, book.doc_id)}
                                                    className="p-2 sm:p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center shadow-md"
                                                    title="Eliminar libro"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
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
                    <div className={`player-container backdrop-blur-xl rounded-3xl p-8 shadow-2xl flex flex-col gap-8 transition-all ${t.player}`}>
                        <div className={`book-container flex justify-center overflow-hidden`}>
                            <FlipBook
                                ref={flipBookRef}
                                docId={docId}
                                totalPages={totalPages}
                                onPageChange={(page) => setCurrentPage(page)}
                                width={isMobile ? 300 : 450}
                                height={isMobile ? 420 : 600}
                                layoutMode={layoutMode}
                            />
                        </div>

                        <div className="w-full">
                            <audio
                                ref={audioRef}
                                onEnded={handleAudioEnded}
                                onPlay={onPlay}
                                onPause={onPause}
                                controls
                                className="hidden"
                            />
                        </div>
                        {/* Watermark / Background Image */}
                    </div>
                )}
            </div>

            {/* Watermark / Background Image */}
            {t.backgroundImage && (
                t.bgRepeat ? (
                    <div
                        className="fixed inset-0 z-0 opacity-10 pointer-events-none select-none"
                        style={{
                            backgroundImage: `url(${t.backgroundImage})`,
                            backgroundRepeat: 'space',
                            backgroundSize: '150px'
                        }}
                    ></div>
                ) : (
                    <div className="fixed bottom-0 right-0 p-8 z-0 opacity-20 pointer-events-none select-none">
                        <img
                            src={t.backgroundImage}
                            alt=""
                            className="w-48 h-auto object-contain drop-shadow-lg"
                        />
                    </div>
                )
            )}

            <footer className="w-full text-center p-4 mt-auto text-xs opacity-60">
                <p>Amori v1.4 &copy; {new Date().getFullYear()} Adamo. All rights reserved.</p>
            </footer>
        </div >
    )
}

export default App
