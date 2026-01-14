import { Cat, Dog } from 'lucide-react';

export const themes = {
    default: {
        id: 'default',
        label: 'Oscuro',
        icon: 'square', // handled in UI
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
        progressColor: "bg-indigo-400"
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
        progressColor: "bg-pink-400"
    },
    puppy: {
        id: 'puppy',
        label: 'Perritos',
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
        progressColor: "bg-amber-400"
    }
};
