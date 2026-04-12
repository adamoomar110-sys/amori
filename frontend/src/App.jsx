import React, { useState, useEffect, useRef, useCallback } from 'react';
import { uploadPDF, uploadPDFFromUrl, getAudioUrl, getPageImageUrl, getDocStatus, getVoices, getLibrary, deleteBook, updateProgress, getSummary } from './api';
import { Square, Cat, Dog, Leaf, Sparkles, X, RotateCcw, Play, Pause, Maximize2, Minimize2, ChevronLeft, ChevronRight, StopCircle, Plus, Minus } from 'lucide-react';
import './BookStyles.css';

import { themes } from './themeConfig';
import FlipBook from './components/FlipBook';

// ─── Splash Screen Component ─────────────────────────────────────────────────
function SplashScreen({ onFinish }) {
    const [phase, setPhase] = useState('fade-in'); // 'fade-in' | 'hold' | 'fade-out'

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('hold'), 600);
        const t2 = setTimeout(() => setPhase('fade-out'), 2800);
        const t3 = setTimeout(() => onFinish(), 3400);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onFinish]);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'radial-gradient(ellipse at 50% 40%, #1a0533 0%, #0d0015 60%, #000 100%)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: phase === 'fade-out' ? 0 : 1,
                transition: phase === 'fade-out' ? 'opacity 0.6s ease' : 'opacity 0.5s ease',
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            {/* Anillos de aura pulsante */}
            {[1,2,3].map(i => (
                <div key={i} style={{
                    position: 'absolute',
                    width: `${180 + i * 90}px`, height: `${180 + i * 90}px`,
                    borderRadius: '50%',
                    border: `1px solid rgba(168, 85, 247, ${0.18 - i * 0.04})`,
                    animation: `splashPulse ${1.8 + i * 0.5}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.3}s`,
                }} />
            ))}

            {/* Logo / Texto AMORI */}
            <div style={{
                position: 'relative',
                opacity: phase === 'fade-in' ? 0 : 1,
                transform: phase === 'fade-in' ? 'scale(0.7) translateY(20px)' : 'scale(1) translateY(0)',
                transition: 'opacity 0.7s cubic-bezier(0.34,1.56,0.64,1), transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                textAlign: 'center',
            }}>
                <div style={{
                    fontSize: 'clamp(64px, 16vw, 130px)',
                    fontWeight: 900,
                    letterSpacing: '-2px',
                    fontFamily: "'Georgia', serif",
                    background: 'linear-gradient(135deg, #e879f9 0%, #a855f7 35%, #7c3aed 65%, #4f46e5 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(168,85,247,0.6))',
                    lineHeight: 1,
                }}>AMORI</div>

                <div style={{
                    marginTop: '12px',
                    fontSize: 'clamp(11px, 2.5vw, 15px)',
                    letterSpacing: '0.35em',
                    color: 'rgba(233, 213, 255, 0.7)',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                }}>Tu audioteca inmersiva</div>
            </div>

            {/* Partículas flotantes */}
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    width: `${3 + (i % 4)}px`, height: `${3 + (i % 4)}px`,
                    borderRadius: '50%',
                    background: `rgba(${168 + i * 5}, ${85 + i * 8}, 247, ${0.4 + (i % 3) * 0.2})`,
                    top: `${10 + (i * 7) % 80}%`,
                    left: `${5 + (i * 11) % 90}%`,
                    animation: `splashFloat ${3 + (i % 4)}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.25}s`,
                }} />
            ))}

            <style>{`
                @keyframes splashPulse {
                    from { transform: scale(0.95); opacity: 0.5; }
                    to   { transform: scale(1.05); opacity: 1; }
                }
                @keyframes splashFloat {
                    from { transform: translateY(0px) translateX(0px); }
                    to   { transform: translateY(-18px) translateX(8px); }
                }
            `}</style>
        </div>
    );
}

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
    const [showSplash, setShowSplash] = useState(true);
    const hideSplash = useCallback(() => setShowSplash(false), []);
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
    const [selectedVoice, setSelectedVoice] = useState("es-VE-SebastianNeural");
    const [jumpPage, setJumpPage] = useState("");
    const [library, setLibrary] = useState([]);
    const [showLibrary, setShowLibrary] = useState(true);
    const [isTranslated, setIsTranslated] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");

    const [layoutMode, setLayoutMode] = useState(window.innerWidth < 768 ? 'single' : 'double');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fsControlsVisible, setFsControlsVisible] = useState(true);
    const fsHideTimer = useRef(null);
    const fullscreenContainerRef = useRef(null);

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

    // --- FULLSCREEN ---
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            if (document.fullscreenElement) {
                setFsControlsVisible(true);
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Auto-ocultar controles en fullscreen tras 3s de inactividad
    const resetFsHideTimer = useCallback(() => {
        setFsControlsVisible(true);
        clearTimeout(fsHideTimer.current);
        fsHideTimer.current = setTimeout(() => setFsControlsVisible(false), 3000);
    }, []);

    useEffect(() => {
        if (isFullscreen) {
            document.body.classList.add('fullscreen-player-active');
            resetFsHideTimer();
            return () => {
                document.body.classList.remove('fullscreen-player-active');
                clearTimeout(fsHideTimer.current);
            };
        } else {
            document.body.classList.remove('fullscreen-player-active');
            clearTimeout(fsHideTimer.current);
            setFsControlsVisible(true);
        }
    }, [isFullscreen]);
    // --- FIN FULLSCREEN ---

    // Carga inicial con reintentos automáticos para tolerar arranque lento del backend
    useEffect(() => {
        let voicesLoaded = false;
        let libraryLoaded = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 20; // hasta ~10 segundos

        const tryLoad = async () => {
            attempts++;
            try {
                if (!voicesLoaded) {
                    const v = await getVoices();
                    setVoices(v);
                    voicesLoaded = true;
                }
            } catch (_) { /* backend todavía iniciando, se reintentará */ }

            try {
                if (!libraryLoaded) {
                    const lib = await getLibrary();
                    setLibrary(lib);
                    libraryLoaded = true;
                }
            } catch (_) { /* backend todavía iniciando, se reintentará */ }

            if ((!voicesLoaded || !libraryLoaded) && attempts < MAX_ATTEMPTS) {
                setTimeout(tryLoad, 500);
            }
        };

        tryLoad();
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
            const msg = error.response?.data?.detail || error.message || "Error desconocido";
            alert(`Error subiendo archivo: ${msg}. Verifica que el servidor (backend) esté corriendo.`);
            setIsUploading(false);
        }
    };

    const handleUrlUpload = async (e) => {
        e.preventDefault();
        if (!pdfUrl.trim()) return;

        setIsUploading(true);
        try {
            const initData = await uploadPDFFromUrl(pdfUrl);
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
                        setPdfUrl("");
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
            console.error("Upload URL failed", error);
            const msg = error.response?.data?.detail || error.message || "Error desconocido";
            alert(`Error descargando archivo web: ${msg}. Verifica que la URL sea un PDF válido.`);
            setIsUploading(false);
        }
    };

    const handleSelectBook = (book) => {
        setDocId(book.doc_id);
        setTotalPages(book.total_pages || 0);
        setCurrentPage(book.last_page || 1);
    };

    const handleRestartBook = async (e, book) => {
        e.stopPropagation();
        if (!window.confirm("¿Quieres reiniciar la lectura desde el principio?")) return;

        try {
            await updateProgress(book.doc_id, 1);
            setDocId(book.doc_id);
            setTotalPages(book.total_pages || 0);
            setCurrentPage(1);
            // Locally update library state to reflect progress in UI if needed
            setLibrary(prev => prev.map(b => b.doc_id === book.doc_id ? { ...b, last_page: 1 } : b));
        } catch (error) {
            console.error("Failed to restart book", error);
            alert("Error al reiniciar el libro");
        }
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

    const [summary, setSummary] = useState(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    const handleGetSummary = async (id = null) => {
        const targetId = id || docId;
        if (!targetId) return;

        setIsSummaryLoading(true);
        setShowSummaryModal(true);
        try {
            const data = await getSummary(targetId);
            setSummary(data.summary);
        } catch (error) {
            console.error("Summary failed", error);
            setSummary("Error al generar el resumen. Por favor, verifica que el archivo tenga texto y que el servidor de IA esté respondiendo.");
        } finally {
            setIsSummaryLoading(false);
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
            {showSplash && <SplashScreen onFinish={hideSplash} />}
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b p-3 shadow-lg transition-colors duration-500 relative ${t.header}`}>
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {docId && (
                            <button
                                onClick={() => setDocId(null)}
                                title="Volver a la biblioteca"
                                className={`h-11 px-4 rounded-xl transition-all duration-200 active:scale-95 flex items-center gap-2 font-bold shadow-md hover:shadow-lg ${t.buttonSecondary}`}
                            >
                                <RotateCcw size={18} />
                                <span>Biblioteca</span>
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
                                        className={`p-1.5 rounded-xl border-2 transition-all duration-300 transform hover:scale-110 active:scale-90 ${theme === th.id ? 'shadow-lg bg-opacity-100 ' + t.ringColor : 'opacity-60 bg-opacity-40 hover:opacity-100'} ${th.id === 'default' ? 'bg-gray-800 border-gray-600' : th.id === 'kitten' ? 'bg-pink-400 border-pink-300' : th.id === 'puppy' ? 'bg-amber-400 border-amber-300' : 'bg-emerald-500 border-emerald-400'}`}
                                        title={th.label}
                                    >
                                        <span className="sr-only">{th.label}</span>
                                        {th.customIcon ? (
                                            <img
                                                src={th.customIcon}
                                                alt={th.label}
                                                className="w-5 h-5 rounded-md object-cover"
                                            />
                                        ) : (
                                            <IconComponent size={16} className={th.id === 'default' ? 'text-white' : 'text-gray-900'} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {docId && (
                        <div className="flex items-center gap-1.5 flex-1 justify-end flex-wrap">

                            {/* Voz + Velocidad */}
                            <div className={`flex items-center gap-1 rounded-xl px-2 border h-11 ${t.input}`}>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    className={`bg-transparent text-sm focus:outline-none max-w-[110px] truncate cursor-pointer font-bold ${theme === 'default' ? '[&>option]:bg-gray-900' : ''}`}
                                    title="Seleccionar Voz"
                                >
                                    {voices.map(v => (
                                        <option key={v.ShortName} value={v.ShortName}>{v.FriendlyName}</option>
                                    ))}
                                </select>
                                <div className="w-px h-5 bg-current opacity-20"></div>
                                <select
                                    value={playbackRate}
                                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                    className={`bg-transparent text-sm focus:outline-none cursor-pointer font-bold w-14 ${theme === 'default' ? '[&>option]:bg-gray-900' : ''}`}
                                    title="Velocidad"
                                >
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                            </div>

                            {/* Layout */}
                            <button
                                onClick={() => setLayoutMode(m => m === 'single' ? 'double' : 'single')}
                                className={`w-11 h-11 rounded-xl transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center font-bold text-sm ${t.buttonSecondary}`}
                                title="Cambiar Diseño"
                            >
                                {layoutMode === 'single' ? <span>[1]</span> : <span>[2]</span>}
                            </button>

                            {/* Traducción */}
                            <button
                                onClick={() => setIsTranslated(!isTranslated)}
                                className={`w-11 h-11 rounded-xl transition-all duration-200 active:scale-90 shadow-md hover:shadow-lg flex items-center justify-center ${isTranslated ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : t.buttonSecondary}`}
                                title="Traducción IA"
                            >
                                <span className="font-bold text-xs">A/文</span>
                            </button>

                            {/* Resumen IA */}
                            <button
                                onClick={() => handleGetSummary()}
                                className={`w-11 h-11 rounded-xl transition-all duration-200 active:scale-90 shadow-md hover:shadow-lg flex items-center justify-center ${showSummaryModal ? 'bg-purple-600 text-white ring-2 ring-purple-400' : t.buttonSecondary}`}
                                title="Resumen con IA"
                            >
                                <Sparkles size={18} />
                            </button>

                            {/* Reiniciar */}
                            <button
                                onClick={(e) => {
                                    const currentBook = library.find(b => b.doc_id === docId);
                                    if (currentBook) handleRestartBook(e, currentBook);
                                }}
                                className={`w-11 h-11 rounded-xl text-amber-600 hover:bg-amber-500/20 transition-all duration-200 active:scale-90 flex items-center justify-center shadow-md ${t.buttonSecondary}`}
                                title="Reiniciar lectura"
                            >
                                <RotateCcw size={18} />
                            </button>

                            {/* Stop */}
                            <button
                                onClick={handleStop}
                                className={`w-11 h-11 rounded-xl text-red-500 hover:bg-red-500/20 transition-all duration-200 active:scale-90 flex items-center justify-center font-bold shadow-md ${t.buttonSecondary}`}
                                title="Detener"
                            >
                                <span className="text-sm">Stop</span>
                            </button>

                            {/* Play / Pausar */}
                            <button
                                onClick={togglePlay}
                                className={`h-11 px-5 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center font-bold ${t.buttonPrimary}`}
                            >
                                {isPlaying ? <span>Pausar</span> : <span>Play</span>}
                            </button>

                            {/* Navegación de páginas */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { if (flipBookRef.current) flipBookRef.current.flipPrev(); }}
                                    disabled={currentPage === 1}
                                    className={`w-11 h-11 rounded-xl disabled:opacity-30 transition-all duration-200 active:scale-90 shadow-md hover:shadow-lg flex items-center justify-center font-bold ${t.buttonSecondary}`}
                                >
                                    <span>{'<'}</span>
                                </button>

                                <div className={`flex items-center rounded-xl px-2 border-2 focus-within:border-current transition-all duration-300 shadow-inner h-11 ${t.input}`}>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpPage}
                                        onChange={(e) => setJumpPage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                                        className="bg-transparent text-center w-10 text-sm font-bold focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="#"
                                    />
                                    <button
                                        onClick={handleJump}
                                        className="hover:opacity-70 transition-opacity font-bold text-sm px-1"
                                        title="Ir a página"
                                    >
                                        <span>Ir</span>
                                    </button>
                                </div>
                                <span className="text-gray-500 text-xs font-bold select-none">/{totalPages}</span>

                                <button
                                    onClick={() => { if (flipBookRef.current) flipBookRef.current.flipNext(); }}
                                    disabled={currentPage === totalPages}
                                    className={`w-11 h-11 rounded-xl disabled:opacity-30 transition-all duration-200 active:scale-90 shadow-md hover:shadow-lg flex items-center justify-center font-bold ${t.buttonSecondary}`}
                                >
                                    <span>{'>'}</span>
                                </button>
                            </div>
                            {/* Pantalla Completa */}
                            <button
                                onClick={toggleFullscreen}
                                className={`w-11 h-11 rounded-xl transition-all duration-200 active:scale-90 shadow-md hover:shadow-lg flex items-center justify-center ${isFullscreen ? 'bg-emerald-600 text-white' : t.buttonSecondary}`}
                                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                            >
                                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>

                            {/* Zoom */}
                            <div className={`flex items-center gap-1 rounded-xl border h-11 px-1 ${t.input}`}>
                                <button
                                    onClick={() => flipBookRef.current?.zoomIn?.() || window.dispatchEvent(new CustomEvent('amori-zoom-in'))}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-all active:scale-90"
                                    title="Acercar"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onClick={() => flipBookRef.current?.resetZoom?.() || window.dispatchEvent(new CustomEvent('amori-reset-zoom'))}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-all active:scale-90 text-xs font-bold opacity-70"
                                    title="Restaurar zoom"
                                >
                                    1:1
                                </button>
                                <button
                                    onClick={() => flipBookRef.current?.zoomOut?.() || window.dispatchEvent(new CustomEvent('amori-zoom-out'))}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-all active:scale-90"
                                    title="Alejar"
                                >
                                    <Minus size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {!docId && (
                        <div className="flex-1"></div>
                    )}
                </div>
            </header>

            <div className={`${docId ? 'py-6 px-3 sm:px-8 w-full' : 'p-3 sm:p-8 pt-2 sm:pt-4 max-w-7xl mx-auto'} transition-all duration-500`}>
                {!docId && (
                    <div className="mb-8 text-center">
                        <p className={`text-lg transition-colors ${theme === 'default' ? 'text-gray-300' : 'opacity-80'}`}>Transforma tus PDFs en audiolibros con voz neuronal y OCR.</p>
                    </div>
                )}

                {!docId ? (<>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`upload-container backdrop-blur-lg rounded-3xl p-8 text-center shadow-2xl transition-all h-full ${t.card} flex flex-col justify-center`}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                <div className="p-6 bg-blue-500/20 rounded-2xl border border-blue-400/30 font-black">
                                    {isUploading ? <span>Cargando...</span> : <span>Subir Archivo</span>}
                                </div>
                                <span className="text-xl font-black text-white">
                                    {isUploading ? "Procesando..." : "Subir PDF local"}
                                </span>
                                <p className="text-gray-400">Soporta texto e imágenes (OCR)</p>
                            </label>
                        </div>
                        
                        <div className={`upload-container backdrop-blur-lg rounded-3xl p-8 text-center shadow-2xl transition-all h-full ${t.card} flex flex-col justify-center items-center gap-4`}>
                            <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 font-black mb-2">
                                <span>Desde Internet</span>
                            </div>
                            <span className="text-xl font-black text-white mb-2">
                                Pegar URL del PDF
                            </span>
                            <form onSubmit={handleUrlUpload} className="w-full max-w-sm flex flex-col gap-3">
                                <input 
                                    type="url" 
                                    placeholder="https://ejemplo.com/libro.pdf" 
                                    value={pdfUrl}
                                    onChange={(e) => setPdfUrl(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                                <button 
                                    type="submit" 
                                    disabled={isUploading}
                                    className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${t.buttonPrimary}`}
                                >
                                    {isUploading ? "Descargando..." : "Importar URL"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {library.length > 0 && (
                        <div className="mt-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <h2 className={`text-2xl font-bold text-center ${t.headerText}`}>Tu Biblioteca</h2>
                                <button
                                    onClick={() => setShowLibrary(!showLibrary)}
                                    className={`px-3 py-1 rounded-xl text-xs transition-colors border ${t.buttonSecondary}`}
                                >
                                    {showLibrary ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>

                            {showLibrary && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-6 sm:gap-8 justify-items-center">
                                    {library.map(book => (
                                        <div
                                            key={book.doc_id}
                                            className={`group relative flex flex-col items-center p-3 sm:p-4 rounded-2xl transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${t.card} w-full`}
                                            style={{ aspectRatio: '2/3', minHeight: '220px' }}
                                            title={book.filename}
                                        >
                                            <div className="relative w-full flex-1 flex items-center justify-center rounded-xl overflow-hidden mb-3 group-hover:scale-[1.03] transition-transform duration-300 min-h-[120px]">
                                                <div className="flex flex-col items-center gap-1 opacity-40">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                                    <span className="text-xs font-bold">PDF</span>
                                                </div>



                                                <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 bg-black/10 sm:bg-black/40 transition-all gap-4">
                                                    <button
                                                        onClick={() => handleSelectBook(book)}
                                                        className="p-3 sm:p-4 bg-blue-500 hover:bg-blue-400 rounded-xl text-white shadow-lg hover:scale-110 transition-all flex flex-col items-center justify-center z-10"
                                                        aria-label="Continuar"
                                                        title="Continuar leyendo"
                                                    >
                                                        <Play size={24} fill="currentColor" />
                                                        <span className="text-[10px] mt-1 font-black">CONTINUAR</span>
                                                    </button>

                                                    {book.last_page > 1 && (
                                                        <button
                                                            onClick={(e) => handleRestartBook(e, book)}
                                                            className="p-3 sm:p-4 bg-amber-500 hover:bg-amber-400 rounded-xl text-white shadow-lg hover:scale-110 transition-all flex flex-col items-center justify-center z-10"
                                                            aria-label="Reiniciar"
                                                            title="Reiniciar desde el inicio"
                                                        >
                                                            <RotateCcw size={24} />
                                                            <span className="text-[10px] mt-1 font-black">REINICIAR</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <span className="text-xs sm:text-sm text-gray-200 font-extrabold w-full text-center px-1 leading-tight line-clamp-2 break-words">
                                                {book.filename.replace('.pdf', '')}
                                            </span>

                                            {/* Progreso */}
                                            <div className="w-full mt-2">
                                                <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${t.progressColor}`}
                                                        style={{ width: `${getProgress(book)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] opacity-50 font-semibold mt-0.5 block text-center">{getProgress(book)}%</span>
                                            </div>

                                            <div className="absolute top-2 right-2 z-50 flex flex-col gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleGetSummary(book.doc_id); }}
                                                    className="p-2 sm:p-2 bg-purple-500/80 hover:bg-purple-500 rounded-xl text-white transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center shadow-md"
                                                    title="Resumen IA"
                                                >
                                                    <Sparkles size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteBook(e, book.doc_id)}
                                                    className="p-2 sm:p-2 bg-red-500/80 hover:bg-red-500 rounded-xl text-white transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center shadow-md"
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
                    <div
                        className={`relative flex flex-col items-center gap-4 w-full ${isFullscreen ? 'fullscreen-player' : ''}`}
                        onMouseMove={isFullscreen ? resetFsHideTimer : undefined}
                        onClick={isFullscreen ? resetFsHideTimer : undefined}
                    >
                        {/* Audio oculto */}
                        <audio
                            ref={audioRef}
                            onEnded={handleAudioEnded}
                            onPlay={onPlay}
                            onPause={onPause}
                            controls
                            className="hidden"
                        />

                        {/* Libro centrado, sin caja, sobre el fondo del tema */}
                        <FlipBook
                            ref={flipBookRef}
                            docId={docId}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                            width={isFullscreen
                                ? Math.floor(window.innerWidth * 0.48)
                                : (isMobile ? Math.floor(window.innerWidth * 0.85) : Math.floor(window.innerHeight * 0.75 * 0.714))
                            }
                            height={isFullscreen
                                ? Math.floor(window.innerHeight * 0.95)
                                : (isMobile ? Math.floor(window.innerWidth * 0.85 * 1.4) : Math.floor(window.innerHeight * 0.75))
                            }
                            layoutMode={layoutMode}
                            isTranslated={isTranslated}
                        />

                        {/* === OVERLAY FULLSCREEN === */}
                        {isFullscreen && (
                            <div
                                className="fs-controls-overlay"
                                style={{
                                    opacity: fsControlsVisible ? 1 : 0,
                                    pointerEvents: fsControlsVisible ? 'auto' : 'none',
                                    transition: 'opacity 0.4s ease'
                                }}
                            >
                                {/* Barra de progreso */}
                                <div className="fs-progress-bar">
                                    <div
                                        className="fs-progress-fill"
                                        style={{ width: `${totalPages ? (currentPage / totalPages) * 100 : 0}%` }}
                                    />
                                </div>

                                {/* Controles */}
                                <div className="fs-controls-bar">
                                    {/* Página info */}
                                    <span className="fs-page-info">
                                        {currentPage} <span className="fs-page-sep">/</span> {totalPages}
                                    </span>

                                    {/* Página anterior */}
                                    <button
                                        onClick={() => { if (flipBookRef.current) flipBookRef.current.flipPrev(); }}
                                        disabled={currentPage === 1}
                                        className="fs-btn"
                                        title="Página anterior"
                                    >
                                        <ChevronLeft size={26} />
                                    </button>

                                    {/* Stop */}
                                    <button
                                        onClick={handleStop}
                                        className="fs-btn fs-btn-stop"
                                        title="Detener audio"
                                    >
                                        <StopCircle size={26} />
                                    </button>

                                    {/* Play / Pausa - botón grande central */}
                                    <button
                                        onClick={togglePlay}
                                        className="fs-btn fs-btn-play"
                                        title={isPlaying ? 'Pausar' : 'Reproducir'}
                                    >
                                        {isPlaying
                                            ? <Pause size={30} fill="white" />
                                            : <Play size={30} fill="white" />
                                        }
                                    </button>

                                    {/* Página siguiente */}
                                    <button
                                        onClick={() => { if (flipBookRef.current) flipBookRef.current.flipNext(); }}
                                        disabled={currentPage === totalPages}
                                        className="fs-btn"
                                        title="Página siguiente"
                                    >
                                        <ChevronRight size={26} />
                                    </button>

                                    {/* Salir pantalla completa */}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="fs-btn fs-btn-exit"
                                        title="Salir de pantalla completa"
                                    >
                                        <Minimize2 size={22} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Summary Modal */}
            {showSummaryModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`relative max-w-2xl w-full max-h-[80vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden ${t.card} border ${t.ringColor}`}>
                        <div className={`flex items-center justify-between p-6 border-b ${t.header}`}>
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${t.headerText}`}>
                                <Sparkles className="text-purple-500" />
                                Resumen Inteligente
                            </h3>
                            <button
                                onClick={() => setShowSummaryModal(false)}
                                className={`p-2 rounded-xl hover:bg-black/10 transition-colors ${t.buttonSecondary}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 text-base leading-relaxed whitespace-pre-line">
                            {isSummaryLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${t.iconColor}`}></div>
                                    <p className="opacity-70 animate-pulse">Analizando documento...</p>
                                </div>
                            ) : (
                                <div className={t.cardTitle}>{summary}</div>
                            )}
                        </div>

                        <div className={`p-4 border-t flex justify-end ${t.header}`}>
                            <button
                                onClick={() => setShowSummaryModal(false)}
                                className={`px-6 py-2 rounded-xl font-medium transition-colors ${t.buttonPrimary}`}
                            >
                                Continuar leyendo
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                <p>Amori v1.8 DEFINITIVA &copy; {new Date().getFullYear()} Adamo. All rights reserved.</p>
            </footer>
        </div >
    )
}

export default App
