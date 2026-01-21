import React, { useState, useEffect, useRef } from 'react';
import { uploadPDF, getAudioUrl, getPageImageUrl, getDocStatus, getVoices, getLibrary, deleteBook } from './api';
import { Upload, Play, Pause, ChevronLeft, ChevronRight, Loader2, FileText, Trash2, Home, Square, Search, Cat, Dog, Leaf, Languages } from 'lucide-react';
import './BookStyles.css';

const themes = {
    default: {
        id: 'default',
        label: 'Oscuro',
        icon: 'square',
        bg: "bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white",
        header: "bg-black/80 border-white/10",
        headerText: "text-white",
        card: "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300",
        cardTitle: "text-gray-300",
        highlight: "text-blue-400",
        titleGradient: "from-blue-400 to-pink-500",
        buttonPrimary: "bg-blue-500 hover:bg-blue-400 text-white",
        buttonSecondary: "bg-white/10 hover:bg-white/20 text-gray-400",
        input: "bg-black/20 border-white/10 text-gray-300",
        player: "bg-black/40 border-white/10",
        progressColor: "bg-indigo-400",
        iconColor: "text-indigo-400",
        ringColor: "ring-white/50",
        activeBg: "bg-white/20",
        iconFill: "fill-current"
    },
    kitten: {
        id: 'kitten',
        label: 'Gatitos',
        icon: 'cat',
        bg: "bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 text-rose-900",
        header: "bg-white/70 border-pink-200 shadow-sm",
        headerText: "text-rose-900",
        card: "bg-white/60 border-pink-200 hover:bg-white/90 text-rose-800 shadow-sm",
        cardTitle: "text-rose-700",
        highlight: "text-pink-500",
        titleGradient: "from-pink-400 to-rose-500",
        buttonPrimary: "bg-pink-400 hover:bg-pink-300 text-white",
        buttonSecondary: "bg-white/40 hover:bg-white/60 text-rose-400",
        input: "bg-white/50 border-pink-200 text-rose-800",
        player: "bg-white/60 border-pink-200 shadow-xl",
        progressColor: "bg-pink-400",
        iconColor: "text-pink-400",
        ringColor: "ring-pink-300",
        activeBg: "bg-pink-100",
        iconFill: "fill-none",
        customIcon: "/kitten-fan.png",
        backgroundImage: "/kitten-fan.png"
    },
    puppy: {
        id: 'puppy',
        label: 'Cowboy',
        icon: 'dog',
        bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 text-stone-800",
        header: "bg-white/70 border-amber-200 shadow-sm",
        headerText: "text-stone-800",
        card: "bg-white/60 border-amber-200 hover:bg-white/90 text-stone-700 shadow-sm",
        cardTitle: "text-stone-800",
        highlight: "text-amber-600",
        titleGradient: "from-amber-500 to-orange-600",
        buttonPrimary: "bg-amber-500 hover:bg-amber-400 text-white",
        buttonSecondary: "bg-white/40 hover:bg-white/60 text-stone-500",
        input: "bg-white/50 border-amber-200 text-stone-800",
        player: "bg-white/60 border-amber-200 shadow-xl",
        progressColor: "bg-amber-400",
        iconColor: "text-amber-500",
        ringColor: "ring-amber-300",
        activeBg: "bg-amber-100",
        iconFill: "fill-none",
        customIcon: "/kitten-cowboy.png",
        backgroundImage: "/kitten-cowboy.png"
    },
    nature: {
        id: 'nature',
        label: 'Naturaleza',
        icon: 'leaf',
        bg: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-400 text-white", // More vibrant green
        header: "bg-emerald-900/20 border-emerald-200/50 shadow-sm",
        headerText: "text-emerald-950",
        card: "bg-white/40 border-emerald-200 hover:bg-white/60 text-emerald-900 shadow-sm",
        cardTitle: "text-emerald-900",
        highlight: "text-emerald-700",
        titleGradient: "from-emerald-700 to-green-800",
        buttonPrimary: "bg-emerald-600 hover:bg-emerald-500 text-white",
        buttonSecondary: "bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-800",
        input: "bg-emerald-900/10 border-emerald-200 text-emerald-900",
        player: "bg-white/40 border-emerald-200 shadow-xl",
        progressColor: "bg-emerald-600",
        iconColor: "text-emerald-700",
        ringColor: "ring-emerald-500",
        activeBg: "bg-emerald-300",
        iconFill: "fill-none"
    }
};

function App() {
    const [docId, setDocId] = useState(null);

    // Initialize theme from localStorage or default to 'nature' for user preference
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('amori-theme');
        return (saved && themes[saved]) ? saved : 'nature'; // Default to nature as requested
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Safety check: Fallback to default if theme key is invalid
    const t = themes[theme] || themes.default;

    // Persist theme changes
    useEffect(() => {
        if (theme) localStorage.setItem('amori-theme', theme);
    }, [theme]);



    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("es-AR-TomasNeural");
    const [jumpPage, setJumpPage] = useState(""); // For the page search input
    const [library, setLibrary] = useState([]);
    const [showLibrary, setShowLibrary] = useState(true);
    const [isTranslated, setIsTranslated] = useState(false);

    // Default to Single page on mobile, Double on desktop
    const [layoutMode, setLayoutMode] = useState(window.innerWidth < 768 ? 'single' : 'double');

    const audioRef = useRef(null);
    const autoAdvanceRef = useRef(false);

    // Fetch voices and Library
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
            if (!currentSrc.includes(selectedVoice)) {
                // Logic to handle voice change
            }
        }
    }, [selectedVoice]);

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
            setCurrentPage(p => p + 1);
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
            setCurrentPage(val);
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

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <div className={`min-h-screen font-sans transition-colors duration-500 relative ${t.bg}`}>
            {/* Background Watermark Pattern */}
            {/* Background Watermark Pattern - FIXED to cover full screen */}
            {t.backgroundImage && (
                <div
                    className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
                    style={{
                        backgroundImage: `url(${t.backgroundImage})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '150px'
                    }}
                ></div>
            )}

            {/* Sticky Header */}
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b p-3 shadow-lg transition-colors duration-500 relative ${t.header}`}>
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    {/* Left: Back & Title */}
                    <div className="flex items-center gap-4">
                        {docId && (
                            <button
                                onClick={() => setDocId(null)}
                                title="Volver a la biblioteca"
                                className={`p-2 rounded-full transition-colors ${t.buttonSecondary}`}
                            >
                                <Home className={`w-6 h-6 ${t.highlight}`} />
                            </button>
                        )}
                        {!docId && (
                            <h1 className={`text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${t.titleGradient}`}>
                                Amori
                            </h1>
                        )}
                    </div>

                    {/* Center/Right: Controls (Only if reading) */}
                    {docId && (
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">

                            {/* Voice & Speed (Hidden on very small screens? No, user requested them) */}
                            <div className={`flex items-center gap-2 rounded-lg p-1 border ${t.input}`}>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    className={`bg-transparent text-xs sm:text-sm focus:outline-none max-w-[80px] sm:max-w-[120px] truncate cursor-pointer ${theme === 'default' ? '[&>option]:bg-gray-900' : ''}`}
                                    title="Seleccionar Voz"
                                >
                                    {voices.map(v => (
                                        <option key={v.ShortName} value={v.ShortName}>{v.FriendlyName}</option>
                                    ))}
                                </select>
                                <div className="w-px h-4 bg-current opacity-20"></div>
                                <select
                                    value={playbackRate}
                                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                    className={`bg-transparent text-xs sm:text-sm focus:outline-none cursor-pointer ${theme === 'default' ? '[&>option]:bg-gray-900' : ''}`}
                                    title="Velocidad"
                                >
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                            </div>

                            {/* Translation Toggle */}
                            <button
                                onClick={() => setIsTranslated(!isTranslated)}
                                className={`p-2 rounded-full transition-colors relative ${isTranslated ? 'bg-indigo-500 text-white shadow-lg' : t.buttonSecondary}`}
                                title={isTranslated ? "Traducir activado (Click para desactivar)" : "Traducir Audio"}
                            >
                                <Languages className={`w-5 h-5 ${isTranslated ? 'fill-current' : ''}`} />
                                {isTranslated && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border border-white"></span>
                                    </span>
                                )}
                            </button>

                            {/* Layout Toggle (Single/Double) */}
                            <button
                                onClick={() => setLayoutMode(m => m === 'single' ? 'double' : 'single')}
                                className={`p-2 rounded-full transition-colors ${t.buttonSecondary}`}
                                title={layoutMode === 'single' ? "Ver Doble Página" : "Ver Una Página"}
                            >
                                {layoutMode === 'single' ?
                                    <div className="flex gap-0.5"><div className="w-3 h-4 border border-current rounded-sm"></div></div> :
                                    <div className="flex gap-0.5"><div className="w-3 h-4 border border-current rounded-sm"></div><div className="w-3 h-4 border border-current rounded-sm"></div></div>
                                }
                            </button>

                            {/* Playback Controls */}
                            <div className={`flex items-center gap-2 rounded-full p-1 border ${t.input}`}>
                                <button
                                    onClick={handleStop}
                                    className="p-2 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-600 transition-colors"
                                    title="Detener (Stop)"
                                >
                                    <Square className="w-4 h-4 fill-current" />
                                </button>

                                <button
                                    onClick={togglePlay}
                                    className={`p-2 rounded-full shadow-md transition-transform hover:scale-105 ${t.buttonPrimary}`}
                                    title={isPlaying ? "Pausar" : "Reproducir"}
                                >
                                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                                </button>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-1.5 rounded-full disabled:opacity-30 ${t.buttonSecondary}`}
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>


                                <div className={`flex items-center rounded-full px-2 py-0.5 border focus-within:border-current transition-colors ${t.input}`}>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpPage}
                                        onChange={(e) => setJumpPage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                                        className="bg-transparent text-center w-8 sm:w-10 text-xs sm:text-sm focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="#"
                                    />
                                    <button
                                        onClick={handleJump}
                                        className="p-1 hover:opacity-70 transition-opacity"
                                        title="Ir a página"
                                    >
                                        <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                                <span className="text-gray-500 text-xs select-none">/ {totalPages}</span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-1.5 rounded-full disabled:opacity-30 ${t.buttonSecondary}`}
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}

                    {!docId && (
                        <div className="flex-1"></div>
                    )}

                    {/* Theme Toggles & Version */}
                    <div className="flex items-center gap-2 ml-4 border-l border-white/10 pl-4">
                        {Object.values(themes).map(themeConfig => {
                            const Icon = { square: Square, cat: Cat, dog: Dog, leaf: Leaf }[themeConfig.icon];
                            const isActive = theme === themeConfig.id;
                            // Determine dynamic classes for visibility
                            const activeClass = isActive
                                ? `${themeConfig.activeBg} ring-4 ${themeConfig.ringColor}`
                                : 'opacity-70 hover:opacity-100 hover:bg-white/10';

                            return (
                                <button
                                    key={themeConfig.id}
                                    onClick={() => handleThemeChange(themeConfig.id)}
                                    // Use explicit colors from config to ensure visibility on all backgrounds
                                    className={`relative z-50 flex items-center justify-center rounded-full transition-all cursor-pointer overflow-hidden ${activeClass}`}
                                    style={{ width: '3cm', height: '3cm' }}
                                    title={themeConfig.label}
                                >
                                    {themeConfig.customIcon ? (
                                        <img
                                            src={themeConfig.customIcon}
                                            alt={themeConfig.label}
                                            className="relative z-10 w-16 h-16 object-contain drop-shadow-md"
                                        />
                                    ) : (
                                        <Icon className={`relative z-10 w-10 h-10 ${themeConfig.iconColor} ${themeConfig.iconFill}`} />
                                    )}
                                </button>
                            );
                        })}

                        <div className="flex flex-col items-end text-[10px] sm:text-xs font-mono select-none px-2 opacity-30 leading-tight">
                            <span>© 2026 Adamo</span>
                            <span>v1.3</span>
                        </div>
                    </div>
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
                                <h2 className={`text-2xl font-bold text-center ${t.headerText}`}>Tu Biblioteca</h2>
                                <button
                                    onClick={() => setShowLibrary(!showLibrary)}
                                    className={`px-3 py-1 rounded-full text-xs transition-colors border ${t.buttonSecondary}`}
                                >
                                    {showLibrary ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>

                            {showLibrary && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
                                    {library.map(book => (
                                        <div
                                            key={book.doc_id}
                                            // Dimensions adjusted for mobile (smaller) vs desktop
                                            // Using classes for width/height instead of fixed style where possible, or query
                                            className={`group relative flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all shadow-lg hover:shadow-xl overflow-hidden ${t.card} w-[140px] h-[200px] sm:w-[150px] sm:h-[212px]`}
                                            title={book.filename}
                                        >

                                            {/* Preview/Icon Area */}
                                            <div className="relative w-full flex-1 flex items-center justify-center rounded-lg sm:rounded-xl overflow-hidden mb-2 bg-black/20 group-hover:scale-105 transition-transform duration-300">
                                                {/* Increased icon size for mobile visibility */}
                                                <FileText className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400/50" />

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 bg-black/10 sm:bg-black/40 transition-opacity">
                                                    <button
                                                        onClick={() => handleSelectBook(book)}
                                                        className="p-3 sm:p-4 bg-blue-500 hover:bg-blue-400 rounded-full text-white shadow-lg hover:scale-110 transition-all transform"
                                                    >
                                                        <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <span className="text-xs sm:text-sm text-gray-300 font-medium truncate w-full text-center px-1">
                                                {book.filename.replace('.pdf', '')}
                                            </span>

                                            {/* Top Metadata / Delete - Moved to end for stacking order safety */}
                                            <div className="absolute top-2 right-2 z-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        console.log("Delete clicked for", book.doc_id);
                                                        handleDeleteBook(e, book.doc_id);
                                                    }}
                                                    className="p-1.5 sm:p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400 hover:text-red-200 transition-colors"
                                                    title="Eliminar libro"
                                                >
                                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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
                        {/* Book Viewer */}
                        {/* Book Viewer */}
                        <div className={`book-container ${layoutMode === 'single' ? 'single-page-view' : ''} flex justify-center`}>
                            <div className="book-spread">
                                {/* Spine Effect - Only double mode */}
                                {currentPage > 1 && layoutMode === 'double' && <div className="book-spine"></div>}

                                {(currentPage === 1 || layoutMode === 'single') ? (
                                    // Single Page View (Cover OR Single Mode)
                                    <div className="book-page">
                                        <img
                                            src={getPageImageUrl(docId, currentPage)}
                                            alt={`Page ${currentPage}`}
                                            className="page-image"
                                        />
                                        <div className="active-reading-indicator"></div>
                                        <span className="page-number">{currentPage}</span>
                                    </div>
                                ) : (
                                    // Two Page Spread (Desktop only)
                                    <>
                                        {/* Left Page (Even) */}
                                        <div className="book-page page-left">
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
                    </div>
                )}
            </div>
        </div >
    )
}

export default App
