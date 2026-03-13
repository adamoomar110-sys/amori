import sys
import os

class Summarizer:
    # ... (existing Summarizer code remains the same as a fallback)
    def __init__(self):
        self.initialized = False
        self.parser = None
        self.summarizer = None
        self.tokenizer = None
        
    def _initialize_lazy(self):
        if self.initialized:
            return

        print("Initializing AI Service (Lazy Loading)...")
        try:
            import nltk
            # Ensure NLTK data is downloaded
            try:
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                print("Downloading NLTK punkt...")
                nltk.download('punkt')
            
            try:
                nltk.data.find('tokenizers/punkt_tab')
            except LookupError:
                print("Downloading NLTK punkt_tab...")
                nltk.download('punkt_tab')

            from sumy.parsers.plaintext import PlaintextParser
            from sumy.nlp.tokenizers import Tokenizer
            from sumy.summarizers.lsa import LsaSummarizer
            from sumy.nlp.stemmers import Stemmer
            from sumy.utils import get_stop_words
            
            self.PlaintextParser = PlaintextParser
            self.Tokenizer = Tokenizer
            self.LsaSummarizer = LsaSummarizer
            self.Stemmer = Stemmer
            self.get_stop_words = get_stop_words
            
            self.initialized = True
            print("AI Service Initialized Successfully.")
        except Exception as e:
            print(f"Error initializing AI Service: {e}")
            raise e

    def generate_summary(self, text: str, sentences_count: int = 5) -> str:
        try:
            self._initialize_lazy()
            
            parser = self.PlaintextParser.from_string(text, self.Tokenizer("spanish"))
            stemmer = self.Stemmer("spanish")
            summarizer = self.LsaSummarizer(stemmer)
            summarizer.stop_words = self.get_stop_words("spanish")

            summary_sentences = summarizer(parser.document, sentences_count)
            
            summary_text = ""
            for sentence in summary_sentences:
                summary_text += str(sentence) + "\n\n"
                
            if not summary_text:
                return "No se pudo generar el resumen. El texto podría ser demasiado corto."
                
            return summary_text.strip()
            
        except Exception as e:
            print(f"Error generating summary: {e}")
            return f"Error al generar el resumen: {str(e)}"

class ClaudeService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.fallback_summarizer = Summarizer()

    def _initialize_client(self):
        if self.client:
            return True
        
        if not self.api_key or self.api_key == "your_api_key_here":
            print("Claude API Key not found or default. Using fallback summarizer.")
            return False
            
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
            return True
        except ImportError:
            print("Anthropic SDK not installed. Using fallback summarizer.")
            return False
        except Exception as e:
            print(f"Error initializing Claude client: {e}")
            return False

    def generate_summary(self, text: str, max_tokens: int = 1024) -> str:
        if not self._initialize_client():
            print("Falling back to LSA Summarizer...")
            return self.fallback_summarizer.generate_summary(text)

        try:
            # We use a specific prompt for summarization
            prompt = (
                "Eres un experto en síntesis de información. Tu tarea es proporcionar un resumen "
                "claro, conciso y profesional del siguiente texto. Mantén los puntos clave y asegúrate "
                "de que el resumen sea coherente. El resumen debe estar en español.\n\n"
                f"Texto a resumir:\n{text}"
            )

            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=max_tokens,
                temperature=0.7,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extracts the text content from the response
            if message.content and len(message.content) > 0:
                return message.content[0].text
            return "No se pudo obtener una respuesta válida de Claude."

        except Exception as e:
            print(f"Error calling Claude API: {e}")
            # Final fallback to local summarizer if API call fails
            return self.fallback_summarizer.generate_summary(text)
