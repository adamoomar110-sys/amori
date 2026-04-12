import React, { useCallback, forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { getPageImageUrl, getPageText } from '../api';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const Page = forwardRef((props, ref) => {
    const [pageText, setPageText] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    useEffect(() => {
        if (props.isTranslated && props.docId) {
            setIsLoading(true);
            getPageText(props.docId, props.number, true)
                .then(data => {
                    setPageText(data.text);
                })
                .catch(err => {
                    console.error("Error fetching translated text", err);
                    setPageText("Error al cargar la traducción.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [props.isTranslated, props.docId, props.number]);

    return (
        <div className="page-content bg-white h-full w-full shadow-md overflow-hidden relative" ref={ref}>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200/20 to-transparent pointer-events-none z-10 w-8"></div>

            <div className="h-full w-full flex items-center justify-center p-4">
                <img
                    src={props.image}
                    alt={`Page ${props.number}`}
                    className="max-h-full max-w-full object-contain shadow-sm"
                    loading="lazy"
                />
            </div>

            {props.isTranslated && (
                <div
                    className="absolute inset-0 z-30 overflow-hidden"
                    style={{
                        background: 'linear-gradient(160deg, #fefaf2 0%, #fdf6e3 40%, #fef8ed 70%, #fefaf2 100%)',
                    }}
                >
                    {/* Imagen original como referencia de layout al fondo */}
                    <img
                        src={props.image}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                        style={{ opacity: 0.07 }}
                    />

                    {/* Líneas decorativas de márgenes */}
                    <div className="absolute top-8 bottom-8 left-10 w-px bg-amber-300/40 pointer-events-none" />
                    <div className="absolute top-8 bottom-8 right-10 w-px bg-amber-300/40 pointer-events-none" />

                    {/* Contenido traducido */}
                    <div className="absolute inset-0 overflow-y-auto px-8 py-10 flex flex-col">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                                <span className="text-xs font-serif italic text-amber-800">Traduciendo...</span>
                            </div>
                        ) : (
                            <div
                                className="text-gray-900 leading-relaxed w-full"
                                style={{
                                    fontFamily: "'Georgia', 'Times New Roman', serif",
                                    // Heurística de tamaño según cantidad de texto para imitar títulos vs cuerpo
                                    fontSize: pageText.length < 150 ? '22px' : '16px',
                                    textAlign: pageText.length < 150 ? 'center' : 'justify',
                                    fontWeight: pageText.length < 150 ? 'bold' : 'normal',
                                }}
                            >
                                {pageText.split('\n').filter(l => l.trim()).map((line, i) => (
                                    <p
                                        key={i}
                                        style={{
                                            marginBottom: '0.8em',
                                            textIndent: (pageText.length > 200 && i > 0) ? '1.5em' : '0',
                                            lineHeight: 1.6,
                                            textTransform: pageText.length < 80 ? 'uppercase' : 'none',
                                            letterSpacing: pageText.length < 80 ? '0.05em' : 'normal',
                                        }}
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Badge traducción */}
                    <div
                        className="absolute top-2 right-2 px-2 py-0.5 text-white text-[9px] rounded font-bold uppercase tracking-widest shadow"
                        style={{ background: 'rgba(180,120,40,0.85)' }}
                    >
                        Traducción IA
                    </div>
                </div>
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-serif">
                {props.number}
            </div>

            {/* Binding shadow/crease */}
            <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-black/5 z-20"></div>
        </div>
    );

});

const FlipBook = forwardRef(({ docId, totalPages, onPageChange, width = 450, height = 650, layoutMode = 'double', isTranslated = false }, ref) => {
    const bookRef = useRef();

    useImperativeHandle(ref, () => ({
        flipNext: () => bookRef.current?.pageFlip()?.flipNext(),
        flipPrev: () => bookRef.current?.pageFlip()?.flipPrev(),
        turnToPage: (pageNum) => bookRef.current?.pageFlip()?.turnToPage(pageNum - 1),
        destroy: () => bookRef.current?.pageFlip()?.destroy()
    }));

    const onFlip = useCallback((e) => {
        if (onPageChange) {
            onPageChange(e.data + 1);
        }
    }, [onPageChange]);

    return (
        <div className="w-full h-full flex justify-center items-center overflow-visible">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
                centerZoomedOut={true}
                disablePadding={false}
            >
                {({ zoomIn, zoomOut, resetTransform }) => {
                    useEffect(() => {
                        window.amoriZoomIn = () => zoomIn();
                        window.amoriZoomOut = () => zoomOut();
                        window.amoriResetZoom = () => resetTransform();
                        return () => {
                            delete window.amoriZoomIn;
                            delete window.amoriZoomOut;
                            delete window.amoriResetZoom;
                        };
                    }, [zoomIn, zoomOut, resetTransform]);

                    return (
                        <TransformComponent wrapperClass="!max-w-none !max-h-none !overflow-visible flex items-center justify-center">
                            <div className="flex justify-center items-center p-4">
                                <HTMLFlipBook
                                    width={width}
                                    height={height}
                                    size="stretch"
                                    minWidth={200}
                                    maxWidth={1200}
                                    minHeight={300}
                                    maxHeight={1600}
                                    maxShadowOpacity={0.5}
                                    showCover={true}
                                    mobileScrollSupport={true}
                                    usePortrait={layoutMode === 'single'}
                                    startPage={0}
                                    drawShadow={true}
                                    flippingTime={1000}
                                    onFlip={onFlip}
                                    ref={bookRef}
                                    className="shadow-2xl"
                                >
                                    {Array.from({ length: totalPages }).map((_, index) => (
                                        <Page
                                            key={index}
                                            number={index + 1}
                                            image={getPageImageUrl(docId, index + 1)}
                                            docId={docId}
                                            isTranslated={isTranslated}
                                        />
                                    ))}
                                </HTMLFlipBook>
                            </div>
                        </TransformComponent>
                    );
                }}
            </TransformWrapper>
        </div>
    );
});

export default FlipBook;
