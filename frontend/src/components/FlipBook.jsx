import React, { useCallback, forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { getPageImageUrl } from '../api';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

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
                <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-[2px] p-6 sm:p-10 flex flex-col items-center justify-center overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-2 opacity-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            <span className="text-xs font-medium text-indigo-600">Traduciendo...</span>
                        </div>
                    ) : (
                        <div className="text-gray-800 text-sm sm:text-base leading-relaxed font-sans text-center max-w-prose animate-in fade-in duration-500">
                            {pageText.split('\n').map((line, i) => (
                                <p key={i} className="mb-4">{line}</p>
                            ))}
                        </div>
                    )}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-500 text-white text-[10px] rounded-full font-bold shadow-sm uppercase tracking-wider">
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
        flipNext: () => {
            bookRef.current?.pageFlip()?.flipNext();
        },
        flipPrev: () => {
            bookRef.current?.pageFlip()?.flipPrev();
        },
        turnToPage: (pageNum) => {
            // react-pageflip uses 0-index
            bookRef.current?.pageFlip()?.turnToPage(pageNum - 1);
        },
        destroy: () => {
            bookRef.current?.pageFlip()?.destroy();
        }
    }));

    const onFlip = useCallback((e) => {
        // e.data is the new page index (0-based)
        if (onPageChange) {
            onPageChange(e.data + 1);
        }
    }, [onPageChange]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={3}
                centerOnInit={true}
                disablePadding={true}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200">
                            <button onClick={() => zoomIn()} className="p-2 hover:bg-gray-100 rounded-full text-gray-700" title="Zoom In">
                                <ZoomIn size={20} />
                            </button>
                            <button onClick={() => zoomOut()} className="p-2 hover:bg-gray-100 rounded-full text-gray-700" title="Zoom Out">
                                <ZoomOut size={20} />
                            </button>
                            <button onClick={() => resetTransform()} className="p-2 hover:bg-gray-100 rounded-full text-gray-700" title="Reset Zoom">
                                <Maximize size={20} />
                            </button>
                        </div>

                        <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center" contentClass="flex items-center justify-center">
                            <div className="py-10">
                                <HTMLFlipBook
                                    width={width}
                                    height={height}
                                    size="stretch"
                                    minWidth={300}
                                    maxWidth={600}
                                    minHeight={400}
                                    maxHeight={800}
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
                                    style={{ margin: "0 auto" }}
                                >
                                    {/* Generate pages dynamically */}
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
                    </>
                )}
            </TransformWrapper>
        </div>
    );
});

export default FlipBook;
