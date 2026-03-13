import os
import sys
from unittest.mock import MagicMock

# Setup path to find ai_service
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from ai_service import ClaudeService

def test_claude_fallback():
    print("Testing Claude fallback mechanism...")
    # Initialize without real API key
    service = ClaudeService(api_key="your_api_key_here")
    
    # It should fallback to local Summarizer
    # We mock the local summarizer to avoid downloading NLTK during test
    service.fallback_summarizer.generate_summary = MagicMock(return_value="Local Summary Fallback")
    
    result = service.generate_summary("Este es un texto de prueba.")
    print(f"Result: {result}")
    
    assert result == "Local Summary Fallback"
    print("Fallback test passed!")

def test_claude_initialization():
    print("Testing Claude initialization logic...")
    service = ClaudeService(api_key="sk-ant-test-key")
    
    # Mock the client
    service.client = MagicMock()
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="Claude Summary Result")]
    service.client.messages.create.return_value = mock_message
    
    # Force initialization to true
    service._initialize_client = MagicMock(return_value=True)
    
    result = service.generate_summary("Texto para Claude.")
    print(f"Result: {result}")
    
    assert "Claude Summary Result" in result
    print("Initialization test passed!")

if __name__ == "__main__":
    try:
        test_claude_fallback()
        test_claude_initialization()
        print("\nAll integration tests passed successfully!")
    except Exception as e:
        print(f"\nTest failed: {e}")
        sys.exit(1)
