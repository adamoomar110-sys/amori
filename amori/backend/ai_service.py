from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words
import nltk

class Summarizer:
    def __init__(self):
        # Ensure NLTK data is downloaded
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        
        try:
            nltk.data.find('tokenizers/punkt_tab')
        except LookupError:
             nltk.download('punkt_tab') # needed for newer nltk

    def generate_summary(self, text: str, sentences_count: int = 5) -> str:
        try:
            parser = PlaintextParser.from_string(text, Tokenizer("spanish"))
            stemmer = Stemmer("spanish")
            summarizer = LsaSummarizer(stemmer)
            summarizer.stop_words = get_stop_words("spanish")

            summary_sentences = summarizer(parser.document, sentences_count)
            
            summary_text = ""
            for sentence in summary_sentences:
                summary_text += str(sentence) + "\n\n"
                
            if not summary_text:
                return "No se pudo generar el resumen. El texto podría ser demasiado corto."
                
            return summary_text.strip()
            
        except Exception as e:
            print(f"Error generating summary: {e}")
            # Fallback to English if Spanish fails (e.g. wrong language detected or model issue)
            try:
                parser = PlaintextParser.from_string(text, Tokenizer("english"))
                summarizer = LsaSummarizer(Stemmer("english"))
                summarizer.stop_words = get_stop_words("english")
                summary_sentences = summarizer(parser.document, sentences_count)
                summary_text = "\n".join([str(s) for s in summary_sentences])
                return summary_text
            except:
                return f"Error al generar el resumen: {str(e)}"
